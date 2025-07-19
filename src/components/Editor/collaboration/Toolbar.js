import { Dropdown, Button } from "react-bootstrap";
import React from "react";
import axios from "axios"; // Make sure axios is imported

const toolbarFunctions = {
  applyStyle: (style) => {
    document.execCommand(style, false, null);
  },

  setAlignment: (alignment) => {
    document.execCommand("justify" + alignment, false, null);
  },

  insertList: (type) => {
    document.execCommand(type === "ordered" ? "insertOrderedList" : "insertUnorderedList", false, null);
  },

  insertMultilevelNumberedList: (type) => {
    document.execCommand(type, false, null);
    
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
  },
  
  changeFont: (fontName) => {
    document.execCommand("fontName", false, fontName);
  },
  
  changeFontSize: (size) => {
    document.execCommand("fontSize", false, size);
  },
  
  changeTextColor: (color) => {
    document.execCommand("foreColor", false, color);
  },
  
  changeHighlightColor: (color) => {
    document.execCommand("hiliteColor", false, color);
  },
  
  applyFormatting: (command, value = null) => {
    document.execCommand(command, false, value);
  },

  saveVersion: (docId) => {
    console.log("Saving document version for:", docId);
    // Add actual save logic here
  },

  updateStatus: async (docId, status) => {
    try {
      const response = await axios.put(`/api/update-document-status/${docId}`, { status });
      
      if (response.data.success) {
        // You could add a notification system here
        console.log(`Document status updated to ${status} successfully`);
        return true;
      } else {
        console.error('Failed to update document status:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('Error updating document status:', error.response?.data?.message || error.message);
      return false;
    }
  }
};

const handleKeyDown = (event) => {
  let selection = window.getSelection();
  let range = selection.getRangeAt(0);
  let listItem = range.startContainer;

  // Find the nearest <li> element
  while (listItem && listItem.nodeName !== "LI") {
      listItem = listItem.parentNode;
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

// Common font families
const fontFamilies = [
  "Arial", 
  "Helvetica", 
  "Times New Roman", 
  "Times", 
  "Courier New", 
  "Courier", 
  "Verdana", 
  "Georgia", 
  "Palatino", 
  "Garamond", 
  "Bookman", 
  "Comic Sans MS", 
  "Trebuchet MS", 
  "Arial Black", 
  "Impact"
];

// Common font sizes
const fontSizes = [
  { value: 1, label: "8pt" },
  { value: 2, label: "10pt" },
  { value: 3, label: "12pt" },
  { value: 4, label: "14pt" },
  { value: 5, label: "18pt" },
  { value: 6, label: "24pt" },
  { value: 7, label: "36pt" }
];

// Color options
const colorOptions = [
  { color: "#000000", name: "Black" },
  { color: "#FF0000", name: "Red" },
  { color: "#0000FF", name: "Blue" },
  { color: "#008000", name: "Green" },
  { color: "#FFA500", name: "Orange" },
  { color: "#800080", name: "Purple" },
  { color: "#FFC0CB", name: "Pink" },
  { color: "#A52A2A", name: "Brown" },
  { color: "#808080", name: "Gray" },
  { color: "#FFFF00", name: "Yellow" }
];

const Toolbar = ({ paperSize, setPaperSize, docId, userName, user }) => (
  <div className="toolbar bg-light p-2 d-flex justify-content-between align-items-center flex-wrap">
    <div className="d-flex flex-wrap">
      {/* Font Family Dropdown */}
      <Dropdown onSelect={toolbarFunctions.changeFont} className="me-2 mb-1">
        <Dropdown.Toggle variant="secondary">Font</Dropdown.Toggle>
        <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {fontFamilies.map((font) => (
            <Dropdown.Item key={font} eventKey={font} style={{ fontFamily: font }}>
              {font}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>

      {/* Font Size Dropdown */}
      <Dropdown onSelect={toolbarFunctions.changeFontSize} className="me-2 mb-1">
        <Dropdown.Toggle variant="secondary">Size</Dropdown.Toggle>
        <Dropdown.Menu>
          {fontSizes.map((size) => (
            <Dropdown.Item key={size.value} eventKey={size.value}>
              {size.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>

      {/* Text Color Dropdown */}
      {/* <Dropdown className="me-2 mb-1">
        <Dropdown.Toggle variant="secondary">
          <i className="bi bi-paint-bucket"></i> Color
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <div className="d-flex flex-wrap p-2" style={{ width: '200px' }}>
            {colorOptions.map((colorOption) => (
              <div 
                key={colorOption.color}
                onClick={() => toolbarFunctions.changeTextColor(colorOption.color)} 
                style={{
                  backgroundColor: colorOption.color,
                  width: '20px',
                  height: '20px',
                  margin: '2px',
                  cursor: 'pointer',
                  border: '1px solid #ddd'
                }}
                title={colorOption.name}
              />
            ))}
          </div>
        </Dropdown.Menu>
      </Dropdown> */}

      {/* Highlight Color Dropdown */}
      {/* <Dropdown className="me-2 mb-1">
        <Dropdown.Toggle variant="secondary">
          <i className="bi bi-highlighter"></i> Highlight
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <div className="d-flex flex-wrap p-2" style={{ width: '200px' }}>
            {colorOptions.map((colorOption) => (
              <div 
                key={colorOption.color}
                onClick={() => toolbarFunctions.changeHighlightColor(colorOption.color)} 
                style={{
                  backgroundColor: colorOption.color,
                  width: '20px',
                  height: '20px',
                  margin: '2px',
                  cursor: 'pointer',
                  border: '1px solid #ddd'
                }}
                title={colorOption.name}
              />
            ))}
            <div 
              onClick={() => toolbarFunctions.changeHighlightColor('transparent')} 
              style={{
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)',
                backgroundSize: '10px 10px',
                backgroundPosition: '0 0, 5px 5px',
                width: '20px',
                height: '20px',
                margin: '2px',
                cursor: 'pointer',
                border: '1px solid #ddd'
              }}
              title="No Highlight"
            />
          </div>
        </Dropdown.Menu>
      </Dropdown> */}

      {/* Heading Dropdown */}
      <Dropdown onSelect={toolbarFunctions.changeHeading} className="me-2 mb-1">
        <Dropdown.Toggle variant="secondary">Heading</Dropdown.Toggle>
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

      {/* Text Formatting Options */}
      {["bold", "italic", "underline", "strikethrough"].map((style) => (
        <Button key={style} onClick={() => toolbarFunctions.applyStyle(style)} variant="outline-dark" className="me-2 mb-1">
          <i className={`bi bi-type-${style}`}></i>
        </Button>
      ))}

      {/* Text Alignment */}
      {["left", "center", "right"].map((align) => (
        <Button key={align} onClick={() => toolbarFunctions.setAlignment(align)} variant="outline-dark" className="me-2 mb-1">
          <i className={`bi bi-text-${align}`}></i>
        </Button>
      ))}

      <Button onClick={() => toolbarFunctions.setAlignment("justify")} variant="outline-dark" className="me-2 mb-1">
        <i className="bi bi-justify"></i>
      </Button>

      {/* Additional Formatting Options */}
      <Button onClick={() => toolbarFunctions.applyFormatting("subscript")} variant="outline-dark" className="me-2 mb-1" title="Subscript">
        <i className="bi bi-subscript"></i>
      </Button>
      
      <Button onClick={() => toolbarFunctions.applyFormatting("superscript")} variant="outline-dark" className="me-2 mb-1" title="Superscript">
        <i className="bi bi-superscript"></i>
      </Button>

      {/* List Options */}
      <Button onClick={() => toolbarFunctions.insertList("unordered")} variant="outline-dark" className="me-2 mb-1">
        <i className="bi bi-list-ul"></i>
      </Button>
      <Button onClick={() => toolbarFunctions.insertList("ordered")} variant="outline-dark" className="me-2 mb-1">
        <i className="bi bi-list-ol"></i>
      </Button>
      <Button onClick={() => toolbarFunctions.insertMultilevelNumberedList("insertOrderedList")} variant="outline-dark" className="me-2 mb-1">
        <i className="bi bi-list-ol"></i> Multilevel
      </Button>

      {/* Undo/Redo */}
      <Button onClick={toolbarFunctions.undo} variant="outline-dark" className="me-2 mb-1">
        <i className="bi bi-arrow-counterclockwise"></i>
      </Button>
      <Button onClick={toolbarFunctions.redo} variant="outline-dark" className="me-2 mb-1">
        <i className="bi bi-arrow-clockwise"></i>
      </Button>
    </div>

    <div className="d-flex">
      {/* Save buttons with appropriate roles and status options */}
      {user?.role === 'author' && (
        <Dropdown>
          <Dropdown.Toggle variant="success" id="author-actions-dropdown">
            <i className="bi bi-floppy me-1"></i> Submit
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item 
              onClick={() => toolbarFunctions.updateStatus(docId, 'in_review')}
            >
              <i className="bi bi-save me-2"></i> Submit For Review
            </Dropdown.Item>
            <Dropdown.Item 
              onClick={() => toolbarFunctions.updateStatus(docId, 'for_approval')}
            >
              <i className="bi bi-send-check me-2"></i> Submit For Approval
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      )}

      {user?.role === 'admin' && (
        <Button onClick={() => toolbarFunctions.updateStatus(docId, 'published')}>
            <i className="bi bi-floppy me-1"></i> Publish
        </Button>
      )}

      {user?.role === 'project_manager' && (
        <Dropdown>
          <Dropdown.Toggle variant="success" id="pm-actions-dropdown">
            <i className="bi bi-floppy me-1"></i> Submit
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item 
              onClick={() => toolbarFunctions.updateStatus(docId, 'in_review')}
            >
              <i className="bi bi-save me-2"></i> Submit For Review
            </Dropdown.Item>
            <Dropdown.Item 
              onClick={() => toolbarFunctions.updateStatus(docId, 'for_approval')}
            >
              <i className="bi bi-send-check me-2"></i> Submit For Approval
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      )}
    </div>
  </div>
);

export { Toolbar, handleKeyDown, toolbarFunctions, fontFamilies, fontSizes, colorOptions };