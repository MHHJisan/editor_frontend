import React from "react";
import { Dropdown, Button } from "react-bootstrap";

const toolbarFunctions = {
  applyStyle: (style) => {
    document.execCommand(style, false, null);
  },

  setAlignment: (alignment) => {
    document.execCommand("justify" + alignment, false, null);
  },

  insertList: (type) => {
    document.execCommand(
      type === "ordered" ? "insertOrderedList" : "insertUnorderedList",
      false,
      null
    );
  },

  insertMultilevelNumberedList: () => {
    document.execCommand("insertOrderedList", false, null);
    
    let selection = window.getSelection();
    let selectedNode = selection.focusNode;

    while (selectedNode && selectedNode.nodeName !== "OL") {
      selectedNode = selectedNode.parentNode;
    }

    if (selectedNode) {
      selectedNode.classList.add("custom-numbered-list");
    }
  },

  undo: () => {
    document.execCommand("undo", false, null);
  },

  redo: () => {
    document.execCommand("redo", false, null);
  },

  changePaperSize: (setPaperSize, size) => {
    setPaperSize(size);
  },

  changeHeading: (heading) => {
    if (document.getSelection) {
      document.execCommand("formatBlock", false, heading);
    }
  }
};

const handleKeyDown = (event) => {
  let selection = window.getSelection();
  
  // Ensure there's a valid selection range
  if (selection.rangeCount === 0) return;
  
  let range = selection.getRangeAt(0);
  let listItem = range.startContainer;

  // Find the nearest <li> element
  while (listItem && listItem.nodeName !== "LI") {
    listItem = listItem.parentNode;
    if (!listItem) break;
  }

  // Only handle tabbing inside a `.custom-numbered-list`
  if (listItem && listItem.closest(".custom-numbered-list")) {
    if (event.key === "Tab") {
      event.preventDefault(); // Prevent default tab behavior

      if (event.shiftKey) {
        // Shift + Tab: Outdent
        let parentList = listItem.parentNode;
        if (parentList.nodeName === "OL" && parentList.classList.contains("custom-numbered-list")) {
          parentList.parentNode.insertBefore(listItem, parentList.nextSibling);
          if (!parentList.hasChildNodes()) {
            parentList.remove();
          }
        }
      } else {
        // Tab: Indent
        let prevItem = listItem.previousElementSibling;
        if (prevItem) {
          let sublist = prevItem.querySelector("ol");
          if (!sublist) {
            sublist = document.createElement("ol");
            sublist.classList.add("custom-numbered-list");
            prevItem.appendChild(sublist);
          }
          sublist.appendChild(listItem);
        }
      }
    }
  } else {
    // If not in a numbered list, ensure normal typing behavior
    if (event.key === "Tab") {
      event.preventDefault();
      document.execCommand("insertText", false, "    "); // Insert 4 spaces
    }
  }
};

const Toolbar = ({ paperSize, setPaperSize, user, isFullScreen, toggleFullScreen }) => {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-section">
        <Dropdown onSelect={toolbarFunctions.changeHeading}>
          <Dropdown.Toggle variant="light" size="sm">
            Heading
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item eventKey="p">Paragraph</Dropdown.Item>
            <Dropdown.Item eventKey="h1">Heading 1</Dropdown.Item>
            <Dropdown.Item eventKey="h2">Heading 2</Dropdown.Item>
            <Dropdown.Item eventKey="h3">Heading 3</Dropdown.Item>
            <Dropdown.Item eventKey="h4">Heading 4</Dropdown.Item>
            <Dropdown.Item eventKey="h5">Heading 5</Dropdown.Item>
            <Dropdown.Item eventKey="h6">Heading 6</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
      
      <div className="toolbar-divider"></div>
      
      <div className="toolbar-section">
        {["bold", "italic", "underline", "strikethrough"].map((style) => (
          <Button 
            key={style} 
            onClick={() => toolbarFunctions.applyStyle(style)} 
            variant="light" 
            size="sm"
          >
            <i className={`bi bi-type-${style}`}></i>
          </Button>
        ))}
      </div>
      
      <div className="toolbar-divider"></div>
      
      <div className="toolbar-section">
        {["left", "center", "right"].map((align) => (
          <Button 
            key={align} 
            onClick={() => toolbarFunctions.setAlignment(align)} 
            variant="light" 
            size="sm"
          >
            <i className={`bi bi-text-${align}`}></i>
          </Button>
        ))}
        <Button 
          onClick={() => toolbarFunctions.setAlignment("justify")} 
          variant="light" 
          size="sm"
        >
          <i className="bi bi-justify"></i>
        </Button>
      </div>
      
      <div className="toolbar-divider"></div>
      
      <div className="toolbar-section">
        <Button 
          onClick={() => toolbarFunctions.insertList("unordered")} 
          variant="light" 
          size="sm"
        >
          <i className="bi bi-list-ul"></i>
        </Button>
        <Button 
          onClick={() => toolbarFunctions.insertList("ordered")} 
          variant="light" 
          size="sm"
        >
          <i className="bi bi-list-ol"></i>
        </Button>
        <Button 
          onClick={() => toolbarFunctions.insertMultilevelNumberedList()} 
          variant="light" 
          size="sm"
          title="Multilevel Numbered List"
        >
          <i className="bi bi-list-nested"></i>
        </Button>
      </div>
      
      <div className="toolbar-divider"></div>
      
      <div className="toolbar-section">
        <Button 
          onClick={toolbarFunctions.undo} 
          variant="light" 
          size="sm"
        >
          <i className="bi bi-arrow-counterclockwise"></i>
        </Button>
        <Button 
          onClick={toolbarFunctions.redo} 
          variant="light" 
          size="sm"
        >
          <i className="bi bi-arrow-clockwise"></i>
        </Button>
        
        {/* Fullscreen toggle button */}
        <Button 
          onClick={toggleFullScreen}
          variant="light"
          size="sm"
          className="ms-2"
          title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
        >
          <i className={`bi ${isFullScreen ? 'bi-fullscreen-exit' : 'bi-fullscreen'}`}></i>
        </Button>
      </div>
    </div>
  );
};

export { Toolbar, handleKeyDown };