import React, { useState, useEffect, useCallback } from "react";

const useTableOfContents = (editorRef, sidebarWidth, setSidebarWidth) => {
  const [toc, setToc] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const updateTOC = useCallback(() => {
    if (!editorRef.current) return;
    
    const headings = Array.from(
      editorRef.current.querySelectorAll("h1, h2, h3, h4, h5, h6")
    );
    
    const newToc = headings.map((heading, index) => {
      const id = `heading-${index}`;
      heading.setAttribute("id", id);
      return { 
        id, 
        text: heading.innerText, 
        level: parseInt(heading.tagName.charAt(1), 10) 
      };
    });
    
    setToc(newToc);
  }, [editorRef]);
  
  useEffect(() => {
    if (editorRef.current) {
      updateTOC();
      const observer = new MutationObserver(updateTOC);
      observer.observe(editorRef.current, { 
        childList: true, 
        subtree: true,
        characterData: true 
      });
      
      return () => observer.disconnect();
    }
  }, [editorRef, updateTOC]);
  
  const TOCComponent = ({ isFullScreen }) => {
    // Determine classes based on mobile and fullscreen state
    const sidebarClasses = `toc-sidebar ${isMobile && isFullScreen && sidebarWidth > 0 ? 'toc-visible' : ''}`;
    
    // Adjust sidebar width for mobile in fullscreen
    const effectiveSidebarWidth = isMobile && isFullScreen && sidebarWidth === 0 ? 0 : 
                                 (sidebarWidth === 0 ? 65 : sidebarWidth);
    
    return (
      <div className={sidebarClasses} style={{ width: `${effectiveSidebarWidth}px` }}>
        <div className="toc-header-row">
          {sidebarWidth === 200 && (
            <h5 className="toc-title">Table of Contents</h5>
          )}
          <button
            className="toc-toggle"
            onClick={() => setSidebarWidth(sidebarWidth === 200 ? 65 : 200)}
            title={sidebarWidth === 200 ? "Collapse sidebar" : "Expand sidebar"}
            style={{ position: 'absolute', left: '15px', top: '15px' }}
          >
            {sidebarWidth === 200 ? "◀" : "▶"}
          </button>
        </div>
        
        {sidebarWidth === 200 && (
          <div className="toc-body">
            {toc.length === 0 ? (
              <p className="toc-empty" style={{ textAlign: 'left' }}>📜 No headings found</p>
            ) : (
              <ul className="list-unstyled" style={{ textAlign: 'left' }}>
                {toc.map((item, index) => (
                  <li 
                    key={index} 
                    style={{ 
                      paddingLeft: `${(item.level - 1) * 15}px`,
                      textAlign: 'left'
                    }}
                  >
                    <a 
                      href={`#${item.id}`} 
                      className="toc-link"
                      onClick={(e) => {
                        // On mobile in fullscreen, close sidebar after clicking
                        if (isMobile && isFullScreen) {
                          setSidebarWidth(0);
                        }
                      }}
                    >
                      ● {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {sidebarWidth === 65 && (
          <div className="toc-icon" style={{ textAlign: 'center', marginTop: '30px' }}>
            <i className="bi bi-list-nested fs-5"></i>
          </div>
        )}
      </div>
    );
  };
  
  return { updateTOC, TOCComponent };
};

export default useTableOfContents;