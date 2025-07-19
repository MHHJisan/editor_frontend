import { useState, useEffect, useCallback } from "react";

const useTableOfContents = (editorRef, sidebarWidth, setSidebarWidth) => {
  const [toc, setToc] = useState([]);

  const updateTOC = useCallback(() => {
    if (!editorRef.current) return;

    const headings = Array.from(editorRef.current.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const newToc = headings.map((heading, index) => {
      const id = `heading-${index}`;
      heading.setAttribute("id", id);
      return { id, text: heading.innerText, level: parseInt(heading.tagName.charAt(1), 10) };
    });

    setToc(newToc);
  }, [editorRef]);

  useEffect(() => {
    if (editorRef.current) {
      updateTOC();
      const observer = new MutationObserver(updateTOC);
      observer.observe(editorRef.current, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, [editorRef, updateTOC]);

  const TOCComponent = () => (
    <div className="toc-sidebar" style={{ width: `${sidebarWidth}px` }}>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setSidebarWidth(sidebarWidth === 200 ? 65 : 200)}
        >
          {sidebarWidth === 200 ? "◀" : "▶"}
        </button>
      <div className="toc-header">
        {sidebarWidth === 200 && <h5 className="toc-title mb-0">Table of Contents</h5>}
      </div>
      {sidebarWidth === 200 && (
        <div className="toc-body">
          <ul className="list-unstyled">
            {toc.length === 0 ? (
              <p className="toc-empty">📜 No headings found</p>
            ) : (
              toc.map((item, index) => (
                <li key={index} style={{ paddingLeft: `${(item.level - 1) * 15}px` }}>
                  <a href={`#${item.id}`} className="toc-link text-dark">
                    ● {item.text}
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );

  return { updateTOC, TOCComponent };
};

export default useTableOfContents;