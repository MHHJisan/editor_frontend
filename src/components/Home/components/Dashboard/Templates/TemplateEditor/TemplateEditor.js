import React, { useEffect, useRef, useState, useCallback } from "react";
import { Form, Button, Toast, ToastContainer } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import './Templates.css';
import { Toolbar, handleKeyDown } from "./components/Toolbar";
import useTableOfContents from "./components/TOC";
import axios from "axios";

const TemplateEditor = ({ user, initialContent, onContentChange }) => {
  const editorRef = useRef(null);
  const [paperSize, setPaperSize] = useState("A4");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [contentData, setContentData] = useState({
    content: initialContent?.content || "",
    paperSize: initialContent?.paperSize ||"A4",
    lastModified: initialContent?.lastModified || new Date().toISOString(),
  });
  
  const { updateTOC, TOCComponent } = useTableOfContents(editorRef, sidebarWidth, setSidebarWidth);

  useEffect(() => {
    if (editorRef.current && initialContent?.content) {
      editorRef.current.innerHTML = initialContent.content;
      updateTOC();
    }
  }, []);

  // Toggle fullscreen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Update content when editor changes
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      
      // Update the contentData state with new content and timestamp
      const updatedContentData = {
        content: newContent,
        paperSize,
        lastModified: new Date().toISOString()
      };
      
      setContentData(updatedContentData);
      
      // Pass the entire contentData object to the parent component
      if (onContentChange) {
        onContentChange(updatedContentData);
      }
    }
    updateTOC();
  }, [updateTOC, onContentChange, paperSize]);

  // Update content data when paper size changes
  useEffect(() => {
    console.log(initialContent);
    const updatedContentData = {
      ...contentData,
      paperSize
    };
    
    setContentData(updatedContentData);
    
    // Pass the updated content data to parent when paper size changes
    if (onContentChange) {
      onContentChange(updatedContentData);
    }
  }, [paperSize, onContentChange]);

  // Add event listener for ESC key to exit fullscreen
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isFullScreen]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className={`template-container ${isFullScreen ? 'full-screen-mode' : ''}`} style={{ display: "flex", flexDirection: "column" }}>
      <Toolbar
        paperSize={paperSize}
        setPaperSize={setPaperSize}
        user={user}
        isFullScreen={isFullScreen}
        toggleFullScreen={toggleFullScreen}
      />
      <div className="main-container">
        <TOCComponent isFullScreen={isFullScreen} />
        <div className="content-container">
          <div className="editor-container">
            <div
              ref={editorRef}
              className={`text-editor paper-${paperSize.toLowerCase()}`}
              contentEditable
              onKeyDown={handleKeyDown}
              onInput={handleContentChange}
              suppressContentEditableWarning={true}
              data-placeholder="Start typing..."
              style={{ textAlign: 'left' }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Mobile TOC Toggle Button - Only visible in fullscreen on mobile */}
      {isFullScreen && (
        <button
          className="toc-toggle-button"
          onClick={() => setSidebarWidth(sidebarWidth === 0 ? 200 : 0)}
        >
          <i className={`bi bi-${sidebarWidth > 0 ? 'x' : 'list'}`}></i>
        </button>
      )}
    </div>
  );
};

export default TemplateEditor;