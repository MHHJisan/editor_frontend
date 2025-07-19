import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  Button, 
  Tabs, 
  Card, 
  Descriptions, 
  Tag, 
  Spin, 
  Alert, 
  Typography, 
  Input, 
  Form, 
  Table, 
  Avatar,
  Tooltip,
  Empty,
  Modal,
  Space
} from 'antd';
import {
  FileTextOutlined,
  FileSearchOutlined,
  HighlightOutlined,
  CloseOutlined,
  CommentOutlined,
  DeleteOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';

const { TabPane } = Tabs;
const { Text } = Typography;

const TemplatePreview = ({ 
  template, 
  categories, 
  users,
  departments,
  currentUser,
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedRange, setSelectedRange] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(true);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const contentRef = useRef(null);
  const [contentHtml, setContentHtml] = useState("");
  const [parsedTemplate, setParsedTemplate] = useState(null);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const selectedRangeRef = useRef(null);
  const [commentPosition, setCommentPosition] = useState(null);
  const [selectedFragment, setSelectedFragment] = useState("");

  // Parse the template data to extract necessary information
  useEffect(() => {
    if (!template) return;

    setLoading(true);
    
    // Parse required_approvers JSON string to get approvers array
    let approvers = [];
    try {
      approvers = template.required_approvers ? JSON.parse(template.required_approvers) : [];
    } catch (e) {
      console.error("Error parsing approvers:", e);
    }
    
    // Parse template_structure to get locked elements
    let lockedElements = [];
    let includeTableOfContents = false;
    let allowAttachments = false;
    try {
      if (template.template_structure) {
        const structure = JSON.parse(template.template_structure);
        lockedElements = structure.locked_elements || [];
        includeTableOfContents = structure.includeTableOfContents || false;
        allowAttachments = structure.allowAttachments || false;
      }
    } catch (e) {
      console.error("Error parsing template structure:", e);
    }
    
    // Parse content and comments
    let contentData = { content: '', comments: [] };
    
    // Parse from comments field which should contain both content and comments
    try {
      if (template.comments) {
        contentData = JSON.parse(template.comments);
      }
    } catch (e) {
      console.error("Error parsing comments:", e);
    }
        
    const parsed = {
      ...template,
      approvers,
      lockedElements,
      includeTableOfContents,
      allowAttachments,
      contentHtml: contentData.content || '',
      parsedComments: contentData.comments || []
    };
    
    setParsedTemplate(parsed);
    setContentHtml(parsed.contentHtml);
    setComments(parsed.parsedComments);
    
    setTimeout(() => setLoading(false), 300);
  }, [template]);

  // Function to create a fragment identifier for selected text
  const createFragmentIdentifier = useCallback((text, context = "") => {
    // Clean the text for use in fragment
    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    // Create context-aware fragment with prefix/suffix for better uniqueness
    let fragment = `:~:text=${encodeURIComponent(cleanText)}`;
    
    // Add context if available to make identifier more unique
    if (context) {
      const cleanContext = context.trim().replace(/\s+/g, ' ');
      fragment = `:~:text=${encodeURIComponent(cleanContext)},${encodeURIComponent(cleanText)}`;
    }
    
    return fragment;
  }, []);

  // Function to extract context around selected text
  const getTextContext = useCallback((range) => {
    if (!range || !contentRef.current) return { prefix: "", suffix: "" };
    
    try {
      // Get the full text content
      const fullText = contentRef.current.textContent || "";
      const selectedText = range.toString();
      
      // Find the position of selected text in full content
      const startIndex = fullText.indexOf(selectedText);
      if (startIndex === -1) return { prefix: "", suffix: "" };
      
      // Extract context (20 characters before and after)
      const contextLength = 20;
      const prefix = fullText.substring(Math.max(0, startIndex - contextLength), startIndex).trim();
      const suffix = fullText.substring(startIndex + selectedText.length, 
                                       Math.min(fullText.length, startIndex + selectedText.length + contextLength)).trim();
      
      return { prefix, suffix };
    } catch (error) {
      console.warn("Error extracting context:", error);
      return { prefix: "", suffix: "" };
    }
  }, []);

  // Function to get template icon based on name
  const getTemplateIcon = (template) => {
    const templateName = template?.name || template?.title || "";
    if (templateName.toLowerCase().includes('contract')) {
      return <FileTextOutlined />;
    } else if (templateName.toLowerCase().includes('proposal')) {
      return <FileSearchOutlined />;
    } else {
      return <FileTextOutlined />;
    }
  };

  // Function to get category details
  const getCategoryDetails = (categoryId) => {
    return categories.find(c => c.category_id === categoryId) || {};
  };

  // Function to parse and display locked elements
  const renderLockedElements = () => {
    if (
      !parsedTemplate?.lockedElements || 
      Object.values(parsedTemplate.lockedElements).filter(isLocked => isLocked).length === 0
    ) {
      return <Text type="secondary">No elements locked</Text>;
    }

    return (
      <ul className="locked-elements-list">
        {Object.entries(parsedTemplate.lockedElements).map(([element, isLocked]) => (
          isLocked && <li key={element}>{element}</li>
        ))}
      </ul>
    );
  };

  // Function to store the selected range for later highlighting
  const storeSelectedRange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount || !contentRef.current) return false;
    
    const range = selection.getRangeAt(0);
    const selectedContent = range.toString().trim();
    
    // Only proceed if we have selected text within the content area
    if (selectedContent && contentRef.current && contentRef.current.contains(range.commonAncestorContainer)) {
      // Make sure we're not selecting text inside an existing highlight
      let insideHighlight = false;
      let node = range.commonAncestorContainer;
      
      while (node && node !== contentRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && 
            node.classList && 
            node.classList.contains('highlighted-text')) {
          insideHighlight = true;
          break;
        }
        node = node.parentNode;
      }
      
      if (!insideHighlight) {
        // Store the range for later use
        selectedRangeRef.current = range.cloneRange();
        
        // Get context and create fragment identifier
        const context = getTextContext(range);
        const fragmentId = createFragmentIdentifier(selectedContent, context.prefix);
        setSelectedFragment(fragmentId);
        
        return true;
      }
    }
    return false;
  }, [getTextContext, createFragmentIdentifier]);

  // Function to handle text selection for commenting
  const handleTextSelection = useCallback(() => {
    if (isAddingComment) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount || !contentRef.current) return;
    
    // Store the selected range and get position info
    if (storeSelectedRange()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      
      if (!rect || rect.top === 0) return;

      // Calculate position relative to content area
      const position = {
        top: rect.top - contentRect.top + contentRef.current.scrollTop,
        left: rect.left - contentRect.left,
        selectedText: selection.toString().trim()
      };
      
      setSelectedText(position.selectedText);
      setCommentPosition(position);
      setIsAddingComment(true);
    }
  }, [isAddingComment, storeSelectedRange]);

  // Clear active highlights
  const clearHighlight = useCallback(() => {
    document.querySelectorAll(".highlighted-active").forEach((el) => 
      el.classList.remove("highlighted-active")
    );
    setActiveCommentId(null);
  }, []);

  // Function to handle clicks on highlighted text
  const handleHighlightClick = useCallback((event) => {
    event.stopPropagation();
    
    // Use event delegation to handle highlight clicks
    const target = event.target.closest('[data-comment-id]');
    if (!target) return;
    
    const commentId = target.dataset.commentId;
    if (!commentId) return;
    
    // Clear any existing highlights
    clearHighlight();
    
    // Set active comment
    setActiveCommentId(commentId);
    
    // Add highlight class to clicked element
    target.classList.add('highlighted-active');
    
    // Find and highlight the comment in the sidebar
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (commentElement) {
      commentElement.scrollIntoView({ behavior: 'smooth' });
      commentElement.classList.add('highlighted-active');
      setTimeout(() => commentElement.classList.remove('highlighted-active'), 2000);
    }
  }, [clearHighlight]);

  // Apply highlight to text using fragment identifier
  const applyHighlight = useCallback((fragmentId, commentId, text) => {
    if (!fragmentId || !commentId || !contentRef.current) return false;
    
    try {
      // Remove existing highlights with the same ID to avoid duplicates
      document.querySelectorAll(`[data-comment-id="${commentId}"]`).forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          // Replace the element with its contents
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        }
      });
      
      // Extract the text from fragment identifier
      const fragmentMatch = fragmentId.match(/:~:text=([^,]+)(?:,(.+))?/);
      if (!fragmentMatch) return false;
      
      const targetText = decodeURIComponent(fragmentMatch[2] || fragmentMatch[1]);
      
      // Find the text in the content
      const textNodes = [];
      
      function findTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          textNodes.push(node);
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            findTextNodes(node.childNodes[i]);
          }
        }
      }
      
      findTextNodes(contentRef.current);
      
      // Try to find exact text match
      for (const node of textNodes) {
        const nodeText = node.textContent;
        const matchIndex = nodeText.indexOf(targetText);
        
        if (matchIndex !== -1) {
          try {
            const range = document.createRange();
            range.setStart(node, matchIndex);
            range.setEnd(node, matchIndex + targetText.length);
            
            // Create a new span for the highlight
            const span = document.createElement("span");
            span.className = "highlighted-text";
            span.dataset.commentId = commentId;
            span.dataset.fragmentId = fragmentId;
            
            // Wrap the selected text with our highlight span
            range.surroundContents(span);
            
            // Add click event to the new highlight span
            span.addEventListener('click', handleHighlightClick);
            
            return true;
          } catch (error) {
            console.warn("Error creating range for highlight:", error);
          }
        }
      }
      
      return false;
    } catch (error) {
      console.warn("Error highlighting text:", error);
      return false;
    }
  }, [handleHighlightClick]);

// Helper function to add highlight to HTML content
const addHighlightToContent = (htmlContent, commentId, selectedText, fragmentId) => {
  // Create a temporary DOM element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Find the text to highlight using the fragment ID or selected text
  const textToHighlight = selectedText.trim();
  
  // Function to recursively search and replace text in text nodes
  const highlightTextInNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const index = text.indexOf(textToHighlight);
      
      if (index !== -1) {
        // Split the text node and insert the highlight span
        const beforeText = text.substring(0, index);
        const afterText = text.substring(index + textToHighlight.length);
        
        const span = document.createElement('span');
        span.className = 'highlighted-text';
        span.setAttribute('data-comment-id', commentId);
        span.setAttribute('data-fragment-id', fragmentId);
        span.textContent = textToHighlight;
        
        const parent = node.parentNode;
        
        if (beforeText) {
          parent.insertBefore(document.createTextNode(beforeText), node);
        }
        parent.insertBefore(span, node);
        if (afterText) {
          parent.insertBefore(document.createTextNode(afterText), node);
        }
        parent.removeChild(node);
        
        return true; // Found and highlighted
      }
    } else {
      // Recursively search child nodes
      for (let child of Array.from(node.childNodes)) {
        if (highlightTextInNode(child)) {
          return true; // Stop after first match
        }
      }
    }
    return false;
  };
  
  // Perform the highlighting
  highlightTextInNode(tempDiv);
  
  return tempDiv.innerHTML;
};

// Simplified reconstructHighlights function that works with React's lifecycle
const reconstructHighlights = useCallback(() => {
  if (!contentRef.current || !comments.length || loading) return;
  
  // This function now only adds click handlers since highlights are already in the HTML
  const highlightSpans = contentRef.current.querySelectorAll('.highlighted-text');
  
  highlightSpans.forEach(span => {
    // Remove existing listeners to avoid duplicates
    span.removeEventListener('click', handleHighlightClick);
    // Add click handler
    span.addEventListener('click', handleHighlightClick);
  });
}, [comments, loading, handleHighlightClick]);

  // Add event listeners to highlight spans when content changes
  useEffect(() => {
    if (!contentRef.current || loading) return;
    
    // Set a short timeout to ensure DOM is fully rendered
    const timeout = setTimeout(() => {
      // Add click event delegation to content container
      contentRef.current.addEventListener('click', handleHighlightClick);
      
      // Reconstruct highlights after content is loaded
      reconstructHighlights();
    }, 300);
    
    return () => {
      clearTimeout(timeout);
      if (contentRef.current) {
        contentRef.current.removeEventListener('click', handleHighlightClick);
      }
    };
  }, [contentHtml, loading, handleHighlightClick, reconstructHighlights]);

  // Function to save comment and highlight text
const saveComment = async () => {
  if (!commentText.trim()) {
    resetCommentState();
    return;
  }
  
  setIsSavingComment(true);
  
  try {
    // Generate a unique ID for the comment
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the new comment object
    const newComment = {
      id: commentId,
      text: commentText,
      highlightedText: selectedText,
      fragmentId: selectedFragment,
      timestamp: new Date(),
      user: currentUser?.name || "Current User",
      email: currentUser?.email || "",
      status: "open"
    };
    
    // Add highlight to the HTML content
    const updatedHtml = addHighlightToContent(contentHtml, commentId, selectedText, selectedFragment);
    
    // Update states
    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    setContentHtml(updatedHtml);
    
    // Create the data to save
    const contentData = {
      content: updatedHtml,
      comments: updatedComments
    };
    
    // Save to database
    await axios.put(`/api/update_content/${parsedTemplate.id || parsedTemplate.template_id}`, {
      comments: JSON.stringify(contentData)
    });
    
    // Reset state
    resetCommentState();
    
  } catch (error) {
    console.error("Error saving comment:", error);
    alert("Error saving comment. Please try again.");
  } finally {
    setIsSavingComment(false);
  }
};
  
  // Reset comment creation state
  const resetCommentState = () => {
    setIsAddingComment(false);
    setSelectedText("");
    selectedRangeRef.current = null;
    setCommentText("");
    setCommentPosition(null);
    setSelectedFragment("");
  };
  
  // Function to delete a comment and its highlight
const deleteComment = async (commentId) => {
  // Find the comment to check permissions
  const commentToDelete = comments.find(comment => comment.id === commentId);
  
  // Check if comment exists
  if (!commentToDelete) {
    console.error(`Cannot delete comment: Comment ID ${commentId} not found`);
    return;
  }
  
  // Check if user has permission to delete (only their own comments)
  if (commentToDelete.email !== currentUser?.email) {
    alert("You can only delete your own comments");
    return;
  }
  
  try {
    // Remove the comment from the comments array
    const updatedComments = comments.filter(comment => comment.id !== commentId);
    
    // Remove the highlight from the HTML content by parsing and cleaning it
    const cleanedHtml = removeHighlightFromContent(contentHtml, commentId);
    
    // Update both states
    setComments(updatedComments);
    setContentHtml(cleanedHtml);
    
    // Create the data to save
    const contentData = {
      content: cleanedHtml,
      comments: updatedComments
    };
    
    // Save to database
    await axios.put(`/api/update_content/${parsedTemplate.id || parsedTemplate.template_id}`, {
      comments: JSON.stringify(contentData)
    });
    
    // Clear active comment if it was the deleted one
    if (activeCommentId === commentId) {
      setActiveCommentId(null);
    }
    
  } catch (error) {
    console.error("Error deleting comment:", error);
    alert("Error deleting comment. Please try again.");
  }
};

// Helper function to remove highlight spans from HTML content
const removeHighlightFromContent = (htmlContent, commentId) => {
  // Create a temporary DOM element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Find all highlight spans with the specific comment ID
  const highlightSpans = tempDiv.querySelectorAll(`[data-comment-id="${commentId}"]`);
  
  // Replace each highlight span with its text content
  highlightSpans.forEach(span => {
    const textNode = document.createTextNode(span.textContent || span.innerText);
    span.parentNode.replaceChild(textNode, span);
  });
  
  return tempDiv.innerHTML;
};

  // Render document content
  const renderDocumentContent = () => {
    if (!contentHtml && !parsedTemplate?.contentHtml) {
      return (
        <div style={{ textAlign: 'center', color: '#999', padding: 80 }}>
          <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <p>Content preview not available</p>
        </div>
      );
    }
    
    const displayContent = contentHtml || parsedTemplate?.contentHtml || '';
    
    return (
      <div className="document-container">
        <div className="document-viewer">
          <div className="document-page">
            <div 
              ref={contentRef}
              className="document-content"
              dangerouslySetInnerHTML={{ __html: displayContent }} 
              onMouseUp={handleTextSelection}
            />
          </div>
        </div>
        
        {showComments && (
          <div className="comments-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Comments ({comments.length})
              </Typography.Title>
              
              <Tooltip title="Close comments panel">
                <Button 
                  type="text" 
                  icon={<CloseOutlined />} 
                  onClick={() => setShowComments(false)} 
                  size="small"
                />
              </Tooltip>
            </div>
            
            {comments.length === 0 ? (
              <Empty 
                description="No comments yet" 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
              />
            ) : (
              <div className="comments-list">
                {comments.map(comment => {
                  // Determine if current user can delete this comment
                  const canDelete = comment.email === currentUser?.email;
                  
                  return (
                    <Card 
                      key={comment.id}
                      data-comment-id={comment.id}
                      size="small" 
                      style={{ 
                        marginBottom: '12px',
                        borderLeft: '3px solid #1890ff',
                        backgroundColor: activeCommentId === comment.id ? '#e6f7ff' : 'white'
                      }}
                      className={activeCommentId === comment.id ? 'highlighted-active' : ''}
                      actions={canDelete ? [
                        <Tooltip key="delete-tooltip" title="Delete comment">
                          <DeleteOutlined 
                            key="delete" 
                            onClick={() => deleteComment(comment.id)} 
                          />
                        </Tooltip>
                      ] : []}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography.Text strong>{comment.user}</Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                            {new Date(comment.timestamp).toLocaleString()}
                          </Typography.Text>
                        </div>
                        
                        <Typography.Paragraph 
                          style={{ 
                            margin: '8px 0', 
                            fontSize: '14px',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {comment.text}
                        </Typography.Paragraph>
                        
                        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                          <blockquote style={{ 
                            margin: '8px 0', 
                            paddingLeft: '8px', 
                            borderLeft: '2px solid #d9d9d9',
                            color: '#666'
                          }}>
                            "{comment.highlightedText}"
                          </blockquote>
                        </Typography.Text>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {!showComments && (
          <Button 
            type="primary"
            icon={<CommentOutlined />}
            className="show-comments-btn"
            onClick={() => setShowComments(true)}
          >
            Show Comments ({comments.length})
          </Button>
        )}
      </div>
    );
  };

  // Function to render approvers table
  const renderApproversTable = () => {
    if (!parsedTemplate?.approvers || parsedTemplate.approvers.length === 0) {
      return <Text type="secondary">No approvers configured</Text>;
    }

    const columns = [
      {
        title: 'Stage',
        dataIndex: 'stage',
        key: 'stage',
        render: (stage) => <Tag>{stage || 'Approval'}</Tag>
      },
      {
        title: 'Department',
        dataIndex: 'department',
        key: 'department',
        render: (deptId) => {
          const dept = departments.find(d => d.id === deptId);
          return dept ? dept.name : `${deptId}`;
        }
      },
      {
        title: 'Mandatory',
        dataIndex: 'mandatory',
        key: 'mandatory',
        render: (mandatory) => (
          <Tag color={mandatory ? 'green' : 'orange'}>
            {mandatory ? 'Yes' : 'No'}
          </Tag>
        )
      }
    ];

    return (
      <Table
        columns={columns}
        dataSource={parsedTemplate.approvers}
        pagination={false}
        size="small"
        rowKey={(record, index) => `approver-${index}`}
      />
    );
  };

  if (!parsedTemplate) return <Spin size="large" tip="Loading template..." />;

  return (
    <>
      <div className="template-page">
        {/* Header */}
        <div className="template-page-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={onCancel}
              style={{ marginRight: 16 }}
            />
            <Avatar 
              icon={getTemplateIcon(parsedTemplate)} 
              size={40}
              style={{ 
                backgroundColor: '#f0f2f5', 
                color: '#1890ff', 
                marginRight: 16
              }} 
            />
            <Typography.Title level={4} style={{ margin: 0 }}>
              {parsedTemplate.name || parsedTemplate.title}
            </Typography.Title>
          </div>
        </div>   

        {/* Content */}
        <div className="template-page-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading template...</div>
            </div>
          ) : (
            <div className="template-content">
              <Tabs defaultActiveKey="content" type="card">
                <TabPane tab="Overview" key="overview">
                  <Card style={{ overflow: 'auto' }} bordered={false}>
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="Template Name">{parsedTemplate.name || parsedTemplate.title}</Descriptions.Item>
                      <Descriptions.Item label="Description">{parsedTemplate.description}</Descriptions.Item>
                      <Descriptions.Item label="Category">
                        {getCategoryDetails(parsedTemplate.category_id || parsedTemplate.categoryId)?.category_name || 'No Category'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag color={parsedTemplate.status === 'approved' ? 'green' : 
                               parsedTemplate.status === 'submitted' ? 'blue' : 'default'}>
                          {parsedTemplate.status || 'Draft'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Created">
                        {parsedTemplate.created_at ? new Date(parsedTemplate.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Last Updated">
                        {parsedTemplate.updated_at ? new Date(parsedTemplate.updated_at).toLocaleDateString() : new Date().toLocaleDateString()}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </TabPane>
                
                <TabPane tab="Content" key="content">
                  <Card style={{ overflow: 'auto' }} bordered={false}>
                    <Alert
                      message="Template Content"
                      description={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            View and comment on the template content. Select text to add comments.
                          </span>
                          <div>
                            <Tag icon={<HighlightOutlined />} color="warning">
                              Select text to add comments
                            </Tag>
                          </div>
                        </div>
                      }
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    
                    <div className="template-content-preview">
                      {renderDocumentContent()}
                    </div>
                  </Card>
                </TabPane>
                
                <TabPane tab="Structure" key="structure">
                  <Card bordered={false}>
                    <div className="template-structure">
                      <Card title="Locked Elements" size="small" style={{ marginBottom: 16 }}>
                        {renderLockedElements()}
                      </Card>
                      
                      <Card title="Document Structure" size="small" style={{ marginBottom: 16 }}>
                        <ul>
                          {parsedTemplate.includeTableOfContents && <li>Includes Table of Contents</li>}
                          {parsedTemplate.allowAttachments && <li>Allows File Attachments</li>}
                          {!parsedTemplate.includeTableOfContents && !parsedTemplate.allowAttachments && 
                            <Text type="secondary">No special structure settings</Text>}
                        </ul>
                      </Card>
                    </div>
                  </Card>
                </TabPane>
                
                <TabPane tab="Approvers" key="approvers">
                  <Card bordered={false}>
                    {renderApproversTable()}
                  </Card>
                </TabPane>
                
                <TabPane tab="Notes" key="notes">
                  <Card bordered={false}>
                    {parsedTemplate.notes ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{parsedTemplate.notes}</div>
                    ) : (
                      <Text type="secondary">No additional notes provided</Text>
                    )}
                  </Card>
                </TabPane>
              </Tabs>
            </div>
          )}
        </div>
        
        {/* Comment Input Modal */}
        <Modal
          title="Add Comment"
          visible={isAddingComment}
          onOk={saveComment}
          onCancel={() => resetCommentState()}
          okText="Save Comment"
          cancelText="Cancel"
          confirmLoading={isSavingComment}
          width={400}
        >
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong>Selected text:</Typography.Text>
            <blockquote style={{ 
              margin: '8px 0', 
              padding: '8px', 
              backgroundColor: 'rgba(255, 230, 0, 0.1)',
              borderLeft: '3px solid rgba(255, 230, 0, 0.5)',
            }}>
              {selectedText}
            </blockquote>
          </div>
          
          <Form.Item label="Comment">
            <Input.TextArea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Enter your comment..."
              autoSize={{ minRows: 3, maxRows: 6 }}
              autoFocus
            />
          </Form.Item>
        </Modal>
      </div>

      {/* Global styles moved to bottom */}
      <style jsx global>{`
        .template-page {
          background-color: #f0f2f5;
          min-height: 100vh;
        }
        
        .template-page-header {
          background-color: #fff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
          padding: 16px 24px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .template-page-content {
          padding: 0 24px 24px 24px;
        }
        
        .template-content {
          background-color: #fff;
          min-height: calc(100vh - 140px);
        }
        
        .document-container {
          display: flex;
          position: relative;
          background-color: white;
          min-height: 600px;
        }
        
        .document-viewer {
          flex: ${showComments ? '1 0 70%' : '1 0 100%'};
          position: relative;
          transition: flex 0.3s ease;
        }
        
        .document-page {
          background-color: white;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          margin: 0 auto;
          max-width: 210mm; /* A4 width */
          min-height: 297mm; /* A4 height */
          position: relative;
          width: 210mm;
        }
        
        .document-content {
          font-family: "Work Sans", "Open Sans", Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          user-select: text;
          width: 100%;
          min-height: 100%;
        }
        
        .comments-panel {
          flex: 1 0 30%;
          border-left: 1px solid #e8e8e8;
          padding: 16px;
          background-color: #f9f9f9;
          max-height: 1000px;
          overflow-y: auto;
        }
        
        .show-comments-btn {
          position: absolute;
          right: 16px;
          top: 16px;
          z-index: 10;
        }
        
        .highlighted-text {
          background-color: rgba(255, 230, 0, 0.3);
          cursor: pointer;
          transition: background-color 0.2s;
          border-radius: 2px;
          padding: 1px 2px;
        }
        
        .highlighted-text:hover {
          background-color: rgba(255, 230, 0, 0.5);
        }
        
        .highlighted-active {
          background-color: rgba(24, 144, 255, 0.2) !important;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.3);
        }
        
        .highlight-comment {
          animation: pulse 1s;
        }
        
        .locked-elements-list {
          margin: 0;
          padding-left: 20px;
        }
        
        .locked-elements-list li {
          margin-bottom: 4px;
        }
        
        .comments-list .ant-card {
          transition: all 0.3s ease;
        }
        
        .comments-list .ant-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(24, 144, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(24, 144, 255, 0); }
        }
        
        /* Print styles for A4 compatibility */
        @media print {
          .document-page {
            box-shadow: none;
            margin: 0;
            padding: 20mm;
            width: 210mm;
            min-height: 297mm;
          }
          
          .comments-panel,
          .show-comments-btn,
          .template-page-header {
            display: none !important;
          }
          
          .document-viewer {
            flex: 1 !important;
          }
        }
        
        /* Responsive adjustments */
        @media (max-width: 1200px) {
          .document-page {
            max-width: 100%;
            width: 100%;
          }
          
          .document-viewer {
            flex: ${showComments ? '1 0 60%' : '1 0 100%'} !important;
          }
          
          .comments-panel {
            flex: 1 0 40% !important;
          }
        }
        
        @media (max-width: 768px) {
          .document-container {
            flex-direction: column;
          }
          
          .document-viewer,
          .comments-panel {
            flex: 1 0 auto !important;
          }
          
          .document-page {
            padding: 20px;
            min-height: auto;
          }
          
          .comments-panel {
            border-left: none;
            border-top: 1px solid #e8e8e8;
            max-height: 400px;
          }
        }
      `}</style>
    </>
  );
};

export default TemplatePreview;