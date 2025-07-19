import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { socket } from "../../utils/SocketProvider";
import { Form, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Editor.css";
import { useAuth } from "../../utils/authService";
import { Toolbar, handleKeyDown } from "./collaboration/Toolbar";
import useTableOfContents from "./collaboration/TOC";
import useFloatingElements from "./collaboration/useFloatingElements";
import Page from "./Page";

const CHARS_PER_PAGE = 1800; // Rough estimate for A4, adjust as needed

function splitTextIntoPages(text) {
  const pages = [];
  for (let i = 0; i < text.length; i += CHARS_PER_PAGE) {
    pages.push(text.slice(i, i + CHARS_PER_PAGE));
  }
  return pages;
}

const Editor = () => {
  const { docId } = useParams();
  const editorRef = useRef(null);
  const [paperSize, setPaperSize] = useState("A4");
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useAuth(); // Get user from auth context
  const userName = user?.email || "Anonymous";
  const [cursors, setCursors] = useState({}); // Stores user cursors

  const [showFloatingElements, setShowFloatingElements] = useState(true);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [floatingButtonPosition, setFloatingButtonPosition] = useState({
    top: 0,
    left: 0,
  });
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [highlightsApplied, setHighlightsApplied] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(200); // 250px for expanded, 50px for collapsed
  const { updateTOC, TOCComponent } = useTableOfContents(
    editorRef,
    sidebarWidth,
    setSidebarWidth
  );

  const {
    floatingElements,
    setFloatingElements,
    addFloatingElement,
    cancelFloatingElement,
    isCommenting,
    isSuggestingEdit,
    setIsCommenting,
    setIsSuggestingEdit,
    commentText,
    setCommentText,
    suggestEditText,
    setSuggestEditText,
    commentPosition,
    setCommentPosition,
    suggestEditPosition,
    setSuggestEditPosition,
    adjustItemPositions,
    reconstructHighlight,
    markCommentAsDone,
    replyComment,
    replySuggestedEdit,
    activeReplyId,
    setActiveReplyId,
    replyText,
    setReplyText,
    approveSuggestedEdit,
    declineSuggestedEdit,
    handleFloatingElementClick,
    clearHighlight,
    activeItemId,
    deleteFloatingElement,
    handleTextDeletion,
    storeSelectedRange,
    realignFloatingItems, // Added realignFloatingItems
  } = useFloatingElements(docId, editorRef);

  // Store references to functions to avoid recreation
  const adjustItemPositionsRef = useRef(adjustItemPositions);
  const reconstructHighlightRef = useRef(reconstructHighlight);
  const updateTOCRef = useRef(updateTOC);
  const realignFloatingItemsRef = useRef(realignFloatingItems); // Added reference

  useEffect(() => {
    adjustItemPositionsRef.current = adjustItemPositions;
    reconstructHighlightRef.current = reconstructHighlight;
    updateTOCRef.current = updateTOC;
    realignFloatingItemsRef.current = realignFloatingItems; // Update reference
  }, [
    adjustItemPositions,
    reconstructHighlight,
    updateTOC,
    realignFloatingItems,
  ]);

  // Debounced text change handler
  const handleTextChange = useCallback(() => {
    if (editorRef.current) {
      setIsTyping(true);
      const newContent = editorRef.current.innerHTML;

      // Emit the updated content to the server
      socket.emit("textChange", { docId, content: newContent });

      // Update TOC without overwriting the DOM
      updateTOCRef.current();

      // Add realignment after content changes
      setTimeout(() => realignFloatingItemsRef.current(), 50);

      // Reset typing state after a delay
      const typingTimer = setTimeout(() => setIsTyping(false), 500);
      return () => clearTimeout(typingTimer);
    }
  }, [docId]);

  // Load document on initial render
  useEffect(() => {
    // Load document content and metadata
    const loadDocument = async () => {
      // Fetch document data
      const docResponse = await axios.get(`/api/documents/${docId}`);
      const docData = docResponse.data;

      // Check and load template if exists
      if (docData.template_id !== null) {
        try {
          const templateResponse = await axios.get(
            `/api/get_template/${docData.template_id}`
          );
          console.log("Template loaded:", templateResponse.data);
        } catch (templateError) {
          console.error("Error loading template:", templateError);
        }
      }

      socket.emit("joinDocument", { docId, userId: socket.id, userName });

      socket.on("loadDocument", ({ content }) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = content;
          updateTOCRef.current(); // Update TOC
          setDocumentLoaded(true); // Mark document as loaded
        }
      });

      socket.on("loadDocElements", ({ comments, suggestedEdits }) => {
        if (editorRef.current && documentLoaded) {
          // Just store the elements in state, the hook will handle highlights
          setFloatingElements([...(comments || []), ...(suggestedEdits || [])]);
          setHighlightsApplied(true);
        }
      });
    };

    loadDocument();

    return () => {
      socket.off("loadDocument");
      socket.off("loadDocElements");
    };
  }, [docId, documentLoaded, setFloatingElements]);

  // Handle floating elements changes
  useEffect(() => {
    if (floatingElements.length > 0 && documentLoaded) {
      const timer = setTimeout(() => {
        adjustItemPositionsRef.current();
        realignFloatingItemsRef.current(); // Add realignment call
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [floatingElements, documentLoaded]);

  // Handle window resize and scroll
  useEffect(() => {
    const handleScrollAndResize = () => {
      if (documentLoaded) {
        // Use RAF to prevent too many calls
        requestAnimationFrame(() => {
          adjustItemPositionsRef.current();
          realignFloatingItemsRef.current(); // Add realignment call
        });
      }
    };

    window.addEventListener("scroll", handleScrollAndResize);
    window.addEventListener("resize", handleScrollAndResize);

    return () => {
      window.removeEventListener("scroll", handleScrollAndResize);
      window.removeEventListener("resize", handleScrollAndResize);
    };
  }, [documentLoaded]);

  // Handle socket events for status updates
  useEffect(() => {
    const handleUpdateDocument = ({ content }) => {
      if (editorRef.current && document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = content;
        updateTOCRef.current();
        setHighlightsApplied(false);

        // Reconstruct highlights and adjust positions
        setTimeout(() => {
          floatingElements.forEach((element) =>
            reconstructHighlightRef.current(element, element.type)
          );
          setTimeout(() => {
            adjustItemPositionsRef.current();
            realignFloatingItemsRef.current(); // Add realignment call
          }, 100);
        }, 100);
      }
    };

    const handleCursorUpdate = ({ userId, cursorPosition, userName }) => {
      setCursors((prevCursors) => ({
        ...prevCursors,
        [userId]: { cursorPosition, userName },
      }));
    };

    socket.on("updateDocument", handleUpdateDocument);
    socket.on("cursorUpdate", handleCursorUpdate);

    return () => {
      socket.off("updateDocument", handleUpdateDocument);
      socket.off("cursorUpdate", handleCursorUpdate);
    };
  }, [floatingElements, setFloatingElements]);

  // Handle text deletion
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.addEventListener("keydown", handleTextDeletion);

    return () => {
      editor.removeEventListener("keydown", handleTextDeletion);
    };
  }, [handleTextDeletion]);

  // Handle cursor movement
  const handleCursorMove = useCallback(() => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const cursorPosition = range.startOffset;
      const parentElement = range.startContainer.parentNode;

      socket.emit("cursorMove", {
        docId,
        userId: socket.id,
        cursorPosition,
        parentId: parentElement ? parentElement.id : null,
        userName,
      });
    }
  }, [docId, userName]);

  // Handle selection change for floating buttons
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      editorRef.current
    ) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      if (!rect || rect.top === 0) return;

      const position = {
        top: rect.top - editorRect.top + editorRef.current.scrollTop,
        left: rect.right - editorRect.left + editorRef.current.scrollLeft + 30,
      };

      setFloatingButtonPosition({
        top: position.top,
        left: position.left,
      });
      setShowFloatingButton(true);
    } else {
      setShowFloatingButton(false);
    }
  }, []);

  // Handle selection change events
  useEffect(() => {
    const handleScrollAndResize = () => {
      const selection = window.getSelection();
      if (
        selection.rangeCount > 0 &&
        !selection.isCollapsed &&
        editorRef.current
      ) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();

        if (!rect || rect.top === 0) return;

        const position = {
          top: rect.top - editorRect.top + editorRef.current.scrollTop,
          left: rect.left - editorRect.left + editorRef.current.scrollLeft,
        };

        setFloatingButtonPosition({
          top: position.top,
        });
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    window.addEventListener("scroll", handleScrollAndResize);
    window.addEventListener("resize", handleScrollAndResize);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener("scroll", handleScrollAndResize);
      window.removeEventListener("resize", handleScrollAndResize);
    };
  }, [handleSelectionChange]);

  // Handle clicks outside active reply input to close it
  useEffect(() => {
    if (activeReplyId) {
      const handleClickOutside = (event) => {
        const activeElement = document.querySelector(
          `[data-comment-id="${activeReplyId}"], [data-suggestededit-id="${activeReplyId}"]`
        );
        if (
          activeElement &&
          !activeElement.contains(event.target) &&
          !event.target.classList.contains("form-control") &&
          !event.target.classList.contains("btn")
        ) {
          setActiveReplyId(null);
          setTimeout(() => {
            adjustItemPositionsRef.current();
            realignFloatingItemsRef.current(); // Add realignment after collapse
          }, 10);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [activeReplyId]);

  // Handle adding a comment with range storing
  const handleAddComment = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount || !editorRef.current) return;

    // Store the selected range for highlighting
    if (storeSelectedRange()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      if (!rect || rect.top === 0) return;

      const position = {
        top: rect.top - editorRect.top + editorRef.current.scrollTop,
        selectedText: selection.toString(),
      };

      setCommentPosition(position);
      setIsCommenting(true);
    }
  }, [setCommentPosition, setIsCommenting, storeSelectedRange]);

  // Handle submitting a comment
  const handleSubmitComment = useCallback(() => {
    addFloatingElement("comment", userName, commentText, commentPosition);
    // Adjust positions after adding element
    setTimeout(() => {
      adjustItemPositionsRef.current();
      realignFloatingItemsRef.current(); // Add realignment after adding comment
    }, 50);
  }, [addFloatingElement, userName, commentText, commentPosition]);

  // Handle adding a suggested edit with range storing
  const handleAddSuggestEdit = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount || !editorRef.current) return;

    // Store the selected range for highlighting
    if (storeSelectedRange()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      if (!rect || rect.top === 0) return;

      const position = {
        top: rect.top - editorRect.top + editorRef.current.scrollTop,
        selectedText: selection.toString(),
      };

      setSuggestEditPosition(position);
      setIsSuggestingEdit(true);
    }
  }, [setSuggestEditPosition, setIsSuggestingEdit, storeSelectedRange]);

  // Handle submitting a suggested edit
  const handleSubmitSuggestEdit = useCallback(() => {
    addFloatingElement(
      "suggestededit",
      userName,
      suggestEditText,
      suggestEditPosition
    );
    // Adjust positions after adding element
    setTimeout(() => {
      adjustItemPositionsRef.current();
      realignFloatingItemsRef.current(); // Add realignment after adding suggestion
    }, 50);
  }, [addFloatingElement, userName, suggestEditText, suggestEditPosition]);

  const handleEditorClick = useCallback(
    (e) => {
      if (!e.target.closest(".floating-comment, .floating-suggestededit")) {
        clearHighlight();
      }
    },
    [clearHighlight]
  );

  const [text, setText] = useState("");
  const pages = splitTextIntoPages(text);

  return (
    <div className="container-fluid">
      <Toolbar
        paperSize={paperSize}
        setPaperSize={setPaperSize}
        docId={docId}
        user={user}
        userName={userName}
      />
      <div className="main-container">
        <TOCComponent />
        <div className="content-container">
          <div className="editor-container" onClick={handleEditorClick}>
            {/* Controlled textarea for input */}
            <textarea
              style={{
                width: "100%",
                minHeight: "120px",
                marginBottom: "20px",
              }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing your document..."
            />
            {/* Render each page */}
            {pages.map((pageText, idx) => (
              <Page key={idx}>
                <div
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {pageText}
                </div>
              </Page>
            ))}
          </div>

          {/* Collapse button for floating elements */}
          <Button
            className="floating-collapse-btn"
            style={{
              position: "fixed",
              top: "85px",
              left: `calc(${sidebarWidth}px + 66%)`,
              zIndex: 1000,
            }}
            onClick={() => {
              setShowFloatingElements(!showFloatingElements);
              setTimeout(() => {
                adjustItemPositionsRef.current();
                realignFloatingItemsRef.current();
              }, 10);
            }}
          >
            <i
              className={`bi bi-chevron-double-${
                showFloatingElements ? "left" : "right"
              }`}
            ></i>
          </Button>

          {showFloatingElements && (
            <>
              {/* Floating buttons for adding comments and suggested edits */}
              {showFloatingButton && (
                <div
                  className="quick-access-toolbar"
                  style={{
                    top: `${floatingButtonPosition.top}px`,
                    left: `${floatingButtonPosition.left}px`,
                  }}
                >
                  <Button
                    variant="light"
                    className="toolbar-btn"
                    onClick={() => {
                      handleAddComment();
                      setShowFloatingButton(false);
                    }}
                  >
                    <i className="bi bi-chat-left-text me-1"></i>
                    Comment
                  </Button>
                  <Button
                    variant="light"
                    className="toolbar-btn"
                    onClick={() => {
                      handleAddSuggestEdit();
                      setShowFloatingButton(false);
                    }}
                  >
                    <i className="bi bi-pencil-square me-1"></i>
                    Suggest Edit
                  </Button>
                </div>
              )}

              {/* Render floating comments */}
              {floatingElements
                .filter((element) => element.type === "comment")
                .map((comment) => (
                  <div
                    key={comment.id}
                    className="floating-comment"
                    data-comment-id={comment.id}
                    style={{
                      top: `${comment.position.top}px`,
                      left: `calc(${sidebarWidth}px + 70%)`,
                      background:
                        activeItemId === comment.id ? "lightyellow" : "white",
                    }}
                    onClick={() =>
                      handleFloatingElementClick(comment.id, "comment")
                    }
                  >
                    {userName === comment.user && (
                      /* Delete Button */
                      <button
                        className="delete-floating-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFloatingElement(comment.id, "comment");
                        }}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}

                    <li className="mb-2 floating-item">
                      <strong>
                        {comment.user}
                        <br />
                        commented on:
                        <span className="badge bg-success badge-ellipsis">
                          {comment.selectedText}
                        </span>
                        <br />
                      </strong>
                      {comment.text}
                    </li>

                    {/* Display Replies */}
                    {comment.replies.length > 0 && (
                      <ul className="mt-2">
                        {comment.replies.map((reply) => (
                          <li key={reply.id} className="text-secondary">
                            <strong>{reply.user}:</strong> {reply.text}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* <div className="d-flex justify-content-end mt-2 gap-2">
                {comment.status === "open" && (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      markCommentAsDone(comment.id);
                      setTimeout(() => {
                        adjustItemPositionsRef.current();
                        realignFloatingItemsRef.current(); // Add realignment
                      }, 10);
                    }}
                  >
                    Done
                  </Button>
                )}
              {activeReplyId !== comment.id && (
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => {
                    // Toggle reply state
                    const isExpanding = activeReplyId !== comment.id;
                    setActiveReplyId(isExpanding ? comment.id : null);
                    
                    // Allow the DOM to update before adjusting positions
                    setTimeout(() => {
                      adjustItemPositionsRef.current();
                      realignFloatingItemsRef.current(); // Add realignment when toggling reply
                    }, 10);
                  }}
                >
                  Reply
                </Button>
                )}
              </div> */}

                    {/* Reply Input Field (Shows Only When Reply Button Clicked) */}
                    {activeReplyId !== comment.id && (
                      <div className="mt-2 d-flex align-items-center gap-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div
                          className="btn btn-primary btn-lg mt-1"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent event bubbling
                            replyComment(userName, comment.id);
                            setActiveReplyId(null); // Close the reply input

                            // Allow the DOM to update before adjusting positions
                            setTimeout(() => {
                              adjustItemPositionsRef.current();
                              realignFloatingItemsRef.current(); // Add realignment after submitting reply
                            }, 10);
                          }}
                        >
                          <i
                            className="bi bi-send"
                            style={{ pointerEvents: "none" }}
                          ></i>
                        </div>
                      </div>
                    )}

                    {comment.status === "deleted" && (
                      <p className="text-danger mt-2">✖ Deleted</p>
                    )}
                  </div>
                ))}

              {/* Render floating suggested edits */}
              {floatingElements
                .filter((element) => element.type === "suggestededit")
                .map((suggestededit) => (
                  <div
                    key={suggestededit.id}
                    className="floating-suggestededit"
                    data-suggestededit-id={suggestededit.id}
                    style={{
                      top: `${suggestededit.position.top}px`,
                      left: `calc(${sidebarWidth}px + 70%)`,
                      background:
                        activeItemId === suggestededit.id
                          ? "lightyellow"
                          : "white",
                    }}
                    onClick={() =>
                      handleFloatingElementClick(
                        suggestededit.id,
                        "suggestededit"
                      )
                    }
                  >
                    {userName === suggestededit.user && (
                      /* Delete Button */
                      <button
                        className="delete-floating-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFloatingElement(
                            suggestededit.id,
                            "suggestededit"
                          );
                        }}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}

                    <li className="mb-2 floating-item">
                      <strong>
                        {suggestededit.user}
                        <br />
                        Replace:
                        <p>
                          "{suggestededit.selectedText}" with "
                          <span style={{ color: "blue" }}>
                            {suggestededit.text}
                          </span>
                          "
                        </p>
                      </strong>
                    </li>

                    {/* Display Replies */}
                    {suggestededit.replies.length > 0 && (
                      <ul className="mt-2">
                        {suggestededit.replies.map((reply) => (
                          <li key={reply.id} className="text-secondary">
                            <strong>{reply.user}:</strong> {reply.text}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="d-flex justify-content-end mt-2 gap-2">
                      {suggestededit.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              approveSuggestedEdit(suggestededit.id);
                              setTimeout(() => {
                                adjustItemPositionsRef.current();
                                realignFloatingItemsRef.current(); // Add realignment
                              }, 10);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              declineSuggestedEdit(suggestededit.id);
                              setTimeout(() => {
                                adjustItemPositionsRef.current();
                                realignFloatingItemsRef.current(); // Add realignment
                              }, 10);
                            }}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {/* {activeReplyId !== suggestededit.id && (
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => {
                    // Toggle reply state
                    const isExpanding = activeReplyId !== suggestededit.id;
                    setActiveReplyId(isExpanding ? suggestededit.id : null);
                    
                    // Allow the DOM to update before adjusting positions
                    setTimeout(() => {
                      adjustItemPositionsRef.current();
                      realignFloatingItemsRef.current(); // Add realignment when toggling reply
                    }, 10);
                  }}
                >
                  Reply
                </Button>
              )} */}
                    </div>

                    {/* Reply Input Field (Shows Only When Reply Button Clicked) */}
                    {activeReplyId !== suggestededit.id && (
                      <div className="mt-2 d-flex align-items-center gap-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <Button
                          className="btn btn-primary btn-lg mt-1"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent event bubbling
                            replySuggestedEdit(userName, suggestededit.id);
                            setActiveReplyId(null); // Close the reply input

                            // Allow the DOM to update before adjusting positions
                            setTimeout(() => {
                              adjustItemPositionsRef.current();
                              realignFloatingItemsRef.current(); // Add realignment after submitting reply
                            }, 10);
                          }}
                        >
                          <i
                            className="bi bi-send"
                            style={{ pointerEvents: "none" }}
                          ></i>
                        </Button>
                      </div>
                    )}

                    {suggestededit.status === "approved" && (
                      <p className="text-success mt-2">✔ Approved</p>
                    )}

                    {suggestededit.status === "declined" && (
                      <p className="text-danger mt-2">✖ Declined</p>
                    )}

                    {suggestededit.status === "deleted" && (
                      <p className="text-danger mt-2">✖ Deleted</p>
                    )}
                  </div>
                ))}

              {/* Comment Input Field */}
              {isCommenting && commentPosition?.top !== undefined && (
                <div
                  className="item-input"
                  style={{
                    top: `${commentPosition.top}px`,
                    left: `calc(${sidebarWidth}px + 70%)`,
                  }}
                >
                  <strong>
                    {userName}
                    <br />
                    commenting on:
                    <span className="badge bg-success badge-ellipsis">
                      {commentPosition.selectedText}
                    </span>
                    <br />
                  </strong>
                  <Form.Control
                    type="textarea"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSubmitComment()
                    }
                    autoFocus
                  />
                  <div className="col">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={handleSubmitComment}
                    >
                      Submit
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        cancelFloatingElement("comment");
                        setTimeout(() => {
                          adjustItemPositionsRef.current();
                          realignFloatingItemsRef.current(); // Add realignment after canceling
                        }, 10);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Suggested Edit Input Field */}
              {isSuggestingEdit && suggestEditPosition?.top !== undefined && (
                <div
                  className="item-input"
                  style={{
                    top: `${suggestEditPosition.top}px`,
                    left: `calc(${sidebarWidth}px + 70%)`,
                  }}
                >
                  <strong>
                    {userName}
                    <br />
                    Replace:
                    <span className="badge bg-success badge-ellipsis">
                      "{suggestEditPosition.selectedText}"
                    </span>{" "}
                    with
                    <br />
                  </strong>
                  <Form.Control
                    type="textarea"
                    placeholder="Suggest a replacement..."
                    value={suggestEditText}
                    onChange={(e) => setSuggestEditText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSubmitSuggestEdit()
                    }
                    autoFocus
                  />
                  <div className="col">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={handleSubmitSuggestEdit}
                    >
                      Submit
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        cancelFloatingElement("suggestededit");
                        setTimeout(() => {
                          adjustItemPositionsRef.current();
                          realignFloatingItemsRef.current(); // Add realignment after canceling
                        }, 10);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;
