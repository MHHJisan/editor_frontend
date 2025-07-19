import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button, Form } from "react-bootstrap";
import useFloatingElements from "./useFloatingElements";

const FloatingElements = ({ docId, editorRef, sidebarWidth, documentLoaded, userName, handleEditorClick }) => {
  const [showFloatingElements, setShowFloatingElements] = useState(true);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [floatingButtonPosition, setFloatingButtonPosition] = useState({ top: 0, left: 0 });

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
    handleTextDeletion,
    storeSelectedRange,
    realignFloatingItems,
  } = useFloatingElements(docId, editorRef);


  // Store references to functions to avoid recreation
  const adjustItemPositionsRef = useRef(adjustItemPositions);
  const reconstructHighlightRef = useRef(reconstructHighlight);
  const realignFloatingItemsRef = useRef(realignFloatingItems); 

  useEffect(() => {
    adjustItemPositionsRef.current = adjustItemPositions;
    reconstructHighlightRef.current = reconstructHighlight;
    realignFloatingItemsRef.current = realignFloatingItems;
  }, [adjustItemPositions, reconstructHighlight, realignFloatingItems]);

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


  // Handle text deletion
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.addEventListener("keydown", handleTextDeletion);

    return () => {
      editor.removeEventListener("keydown", handleTextDeletion);
    };
  }, [handleTextDeletion]);

  // Handle selection change for floating buttons
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed && editorRef.current) {
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
        left: position.left
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
      if (selection.rangeCount > 0 && !selection.isCollapsed && editorRef.current) {
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
    window.addEventListener('scroll', handleScrollAndResize);
    window.addEventListener('resize', handleScrollAndResize);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener('scroll', handleScrollAndResize);
      window.removeEventListener('resize', handleScrollAndResize);
    };
  }, [handleSelectionChange]);

  // Handle clicks outside active reply input to close it
  useEffect(() => {
    if (activeReplyId) {
      const handleClickOutside = (event) => {
        const activeElement = document.querySelector(`[data-comment-id="${activeReplyId}"], [data-suggestededit-id="${activeReplyId}"]`);
        if (activeElement && !activeElement.contains(event.target) && 
            !event.target.classList.contains('form-control') && 
            !event.target.classList.contains('btn')) {
          setActiveReplyId(null);
          setTimeout(() => {
            adjustItemPositionsRef.current();
            realignFloatingItemsRef.current(); // Add realignment after collapse
          }, 10);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
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
    addFloatingElement("suggestededit", userName, suggestEditText, suggestEditPosition);
    // Adjust positions after adding element
    setTimeout(() => {
      adjustItemPositionsRef.current();
      realignFloatingItemsRef.current(); // Add realignment after adding suggestion
    }, 50);
  }, [addFloatingElement, userName, suggestEditText, suggestEditPosition]);

  const handleClickOutsideElements = useCallback((e) => {
    // Call the passed handleEditorClick to clear highlights
    if (handleEditorClick) {
      handleEditorClick(e);
    }
  }, [handleEditorClick]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".floating-comment, .floating-suggestededit, .text-editor")) {
        handleClickOutsideElements(event);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutsideElements]);

  return (
    <>
        {/* Collapse button for floating elements */}
        <Button 
          className="floating-collapse-btn"
          style={{ 
            position: 'fixed',
            top: '85px', 
            left: `calc(${sidebarWidth}px + 65%)`, 
            zIndex: 1000 
          }}
          onClick={() => {
            setShowFloatingElements(!showFloatingElements)
            setTimeout(() => {
            adjustItemPositionsRef.current();
            realignFloatingItemsRef.current(); // Add realignment
            }, 10);
          }}
        >
          <i className={`bi bi-chevron-double-${showFloatingElements ? 'left' : 'right'}`}></i>
        </Button>

        {showFloatingElements && (
        <>
        {/* Floating buttons for adding comments and suggested edits */}
        {showFloatingButton && (
          <>
            <Button
              className="floating-add-comment-btn"
              style={{ top: `${floatingButtonPosition.top}px`, left: `calc(${sidebarWidth}px + 65%)` }}
              onClick={() => {
                handleAddComment();
                setShowFloatingButton(false); // Hide after clicking
              }}
            >
              <i className="bi bi-chat-left-text"></i>
            </Button>
            <Button
              className="floating-suggest-edit-btn"
              style={{ top: `${floatingButtonPosition.top + 40}px`, left: `calc(${sidebarWidth}px + 65%)` }}
              onClick={() => {
                handleAddSuggestEdit();
                setShowFloatingButton(false); // Hide after clicking
              }}
            >
              <i className="bi bi-pencil-square"></i>
            </Button>
          </>
        )}

        {/* Render floating comments */}
        {floatingElements
          .filter((element) => element.type === "comment")
          .map((comment) => (
            <div
              key={comment.id}
              className="floating-comment"
              data-comment-id={comment.id}
              style={{ top: `${comment.position.top}px`, left: `calc(${sidebarWidth}px + 70%)`, background: activeItemId === comment.id ? "lightyellow" : "white" }}
              onClick={() => handleFloatingElementClick(comment.id, "comment")}
            >
              <li className="mb-2 floating-item">
                <strong>
                  {comment.user}
                  <br />
                  commented on:
                  <span className="badge bg-success badge-ellipsis">{comment.selectedText}</span>
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

              <div className="d-flex justify-content-end mt-2 gap-2">
                {/* {comment.status === "open" && (
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
                )} */}
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
              </div>

              {/* Reply Input Field (Shows Only When Reply Button Clicked) */}
              {activeReplyId === comment.id && (
                <div className="mt-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="mt-1"
                    onClick={() => {
                      replyComment(userName, comment.id);
                      setActiveReplyId(null); // Close the reply input
                      
                      // Allow the DOM to update before adjusting positions
                      setTimeout(() => {
                        adjustItemPositionsRef.current();
                        realignFloatingItemsRef.current(); // Add realignment after submitting reply
                      }, 10);
                    }}
                  >
                    Submit Reply
                  </Button>
                </div>
              )}

              {comment.status === "done" && <p className="text-muted mt-2">✔ Resolved</p>}
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
              style={{ top: `${suggestededit.position.top}px`, left: `calc(${sidebarWidth}px + 70%)`, background: activeItemId === suggestededit.id ? "lightyellow" : "white" }}
              onClick={() => handleFloatingElementClick(suggestededit.id, "suggestededit")}
            >
              <li className="mb-2 floating-item">
                <strong>
                  {suggestededit.user}
                  <br />
                  Replace:
                  <p>
                    "{suggestededit.selectedText}" with "
                    <span style={{ color: "blue" }}>{suggestededit.text}</span>"
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
              </div>

              {/* Reply Input Field (Shows Only When Reply Button Clicked) */}
              {activeReplyId === suggestededit.id && (
                <div className="mt-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="mt-1"
                    onClick={() => {
                      replySuggestedEdit(userName, suggestededit.id);
                      setActiveReplyId(null); // Close the reply input
                      
                      // Allow the DOM to update before adjusting positions
                      setTimeout(() => {
                        adjustItemPositionsRef.current();
                        realignFloatingItemsRef.current(); // Add realignment after submitting reply
                      }, 10);
                    }}
                  >
                    Submit Reply
                  </Button>
                </div>
              )}

              {suggestededit.status === "approved" && (
                <p className="text-success mt-2">✔ Approved</p>
              )}

              {suggestededit.status === "declined" && (
                <p className="text-danger mt-2">✖ Declined</p>
              )}
            </div>
          ))}

        {/* Comment Input Field */}
        {isCommenting && commentPosition?.top !== undefined && (
          <div
            className="item-input"
            style={{ top: `${commentPosition.top}px`, left: `calc(${sidebarWidth}px + 70%)` }}
          >
            <strong>
              {userName}
              <br />
              commenting on:
              <span className="badge bg-success badge-ellipsis">{commentPosition.selectedText}</span>
              <br />
            </strong>
            <Form.Control
              type="textarea"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
              autoFocus
            />
            <div className="col">
              <Button size="sm" variant="success" onClick={handleSubmitComment}>
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
            style={{ top: `${suggestEditPosition.top}px`, left: `calc(${sidebarWidth}px + 70%)` }}
          >
            <strong>
              {userName}
              <br />
              Replace:
              <span className="badge bg-success badge-ellipsis">"{suggestEditPosition.selectedText}"</span> with
              <br />
            </strong>
            <Form.Control
              style={{ fontSize: `13px` }}
              type="textarea"
              placeholder="Suggest a replacement..."
              value={suggestEditText}
              onChange={(e) => setSuggestEditText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitSuggestEdit()}
              autoFocus
            />
            <div className="col">
              <Button size="sm" variant="success" onClick={handleSubmitSuggestEdit}>
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
    </>
  );
};

export default FloatingElements;