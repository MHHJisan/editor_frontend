import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { successAlert, errorAlert, confirmAlert, toastAlert } from '../../../../../utils/alerts';
import { 
  Card, 
  List, 
  Button, 
  Tag, 
  Avatar, 
  Typography, 
  Tabs, 
  Empty, 
  Radio, 
  Space, 
  Tooltip, 
  Divider,
  Badge,
  Skeleton,
  Breadcrumb,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Table,
  Dropdown,
  Menu,
  Spin,
  Descriptions,
  Alert
} from 'antd';
import { 
  FileOutlined, 
  EyeOutlined, 
  EditOutlined, 
  FolderOutlined,
  FolderAddOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  LockOutlined,
  UserOutlined,
  AppstoreOutlined,
  BarsOutlined,
  PlusOutlined,
  GlobalOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  DeleteOutlined,
  DownOutlined,
  UpOutlined,
  MoreOutlined,
  CopyOutlined,
  ExportOutlined,
  FolderOpenOutlined,
  FileAddOutlined,
  EllipsisOutlined,
  InboxOutlined,
  RollbackOutlined,
  FileSearchOutlined,
  PrinterOutlined,
  DownloadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const Templates = ({ user, navigate, fetchUserData, templates, users, PUBLIC_TEMPLATES, handleCreateTemplate, handleEditTemplate, categories, departments }) => {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('blocks'); // 'blocks' or 'folders'
  const [publicTemplates] = useState(PUBLIC_TEMPLATES);
  const [orgTemplates, setOrgTemplates] = useState([]);
  const [orgCategories, setOrgCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState({ id: 0, path: "" });
  const [addCategoryVisible, setAddCategoryVisible] = useState(false);
  const [addCategoryForm] = Form.useForm();
  const [editCategoryVisible, setEditCategoryVisible] = useState(false);
  const [editCategoryForm] = Form.useForm();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState("2");
  const [expandDraft, setExpandDraft] = useState(false);
  const [expandPending, setExpandPending] = useState(false);
  const [expandArchived, setExpandArchived] = useState(false);
  const [expandApproved, setExpandApproved] = useState(false);
  const [moveCategoryVisible, setMoveCategoryVisible] = useState(false);
  const [moveCategoryForm] = Form.useForm();
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Fetch organization templates from the database
  useEffect(() => {
    const fetchOrgTemplates = async () => {
      try {
        setLoading(true);
        // In a real implementation, you would fetch this from your API
        if (templates && templates.length > 0) {
          const orgTemps = templates.filter(t => t.organization_id === user.orgId);
          setOrgTemplates(orgTemps);
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      } finally {
        setLoading(false);
      }
    };

    // Process categories from props
    const processOrgCategories = () => {
      if (categories && categories.length > 0) {
        const templateCategories = categories.filter(c => c.organization_id === user.orgId);
        setOrgCategories(templateCategories);
      }
    };

    fetchOrgTemplates();
    processOrgCategories();
  }, [user, templates, categories]);

// Format the template data for display
  const formatTemplateData = (template) => {
    const isPublicTemplate = !template.organization_id;
    
    // For public templates - use simplified structure
    if (isPublicTemplate) {
      return {
        id: template.id,
        title: template.title,
        description: template.description || "No description available",
        content: template.content,
        lockedSections: template.lockedSections,
        isLocked: template.lockedSections && JSON.parse(template.lockedSections).length > 0,
        status: "approved" // Public templates are always approved
      };
    }
    
    // For org templates with category - get category prefix and combine with title
    let formattedTitle = template.name;
    if (template.category_id) {
      const category = orgCategories.find(c => c.category_id === template.category_id);
      if (category && category.category_prefix) {
        formattedTitle = `${category.category_prefix} - ${template.name}`;
      }
    }
    
    // For org templates - use full structure
    return {
      id: template.id,
      title: formattedTitle,
      originalTitle: template.name,
      description: template.description || "No description available",
      content: template.content,
      lockedSections: template.locked_sections,
      requiredApprovers: template.required_approvers,
      categoryId: template.category_id,
      createdBy: template.created_by,
      status: template.status,
      createdAt: new Date(template.created_at).toLocaleDateString(),
      updatedAt: new Date(template.updated_at).toLocaleDateString(),
      isLocked: template.locked_sections && JSON.parse(template.locked_sections).length > 0,
      hasApprovers: template.required_approvers && JSON.parse(template.required_approvers).length > 0
    };
  };

  const getTemplateIcon = (template) => {
    const templateName = template.title || template.name || "";
    // Determine icon based on template type
    if (templateName.toLowerCase().includes('contract')) {
      return <FileTextOutlined />;
    } else if (templateName.toLowerCase().includes('proposal')) {
      return <FilePdfOutlined />;
    } else {
      return <FileOutlined />;
    }
  };

  // Add these new functions to handle archive and restore operations
  const handleArchiveTemplate = async (templateId) => {
    try {
      // In a real implementation, you would call your API to archive the template
      // Example API call:
      // await axios.put(`/api/templates/${templateId}/archive`, {
      //   organization_id: user.orgId
      // });
      
      // For this implementation, we'll update the local state
      const updatedTemplates = orgTemplates.map(t => {
        if (t.id === templateId) {
          return {...t, status: 'archived'};
        }
        return t;
      });
      
      setOrgTemplates(updatedTemplates);
      message.success('Template archived successfully');
    } catch (error) {
      console.error("Failed to archive template:", error);
      message.error('Failed to archive template');
    }
  };

  const handleRestoreTemplate = async (templateId) => {
    try {
      // In a real implementation, you would call your API to restore the template
      // Example API call:
      // await axios.put(`/api/templates/${templateId}/restore`, {
      //   organization_id: user.orgId
      // });
      
      // For this implementation, we'll update the local state
      const updatedTemplates = orgTemplates.map(t => {
        if (t.id === templateId) {
          return {...t, status: 'published'};
        }
        return t;
      });
      
      setOrgTemplates(updatedTemplates);
      message.success('Template restored successfully');
    } catch (error) {
      console.error("Failed to restore template:", error);
      message.error('Failed to restore template');
    }
  };

  const handleDeleteTemplate = (templateId) => {
    // In a real implementation, you would call your API to delete the template
    const updatedTemplates = orgTemplates.filter(t => t.id !== templateId);
    setOrgTemplates(updatedTemplates);
    message.success('Template deleted successfully');
  };

  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
    setPreviewModalVisible(true);
  };

  const renderTemplateItem = (template) => {
    const formattedTemplate = formatTemplateData(template);
    const isPublicTemplate = !template.organization_id;
    const isApprovedTemplate = formattedTemplate.status === 'pm_approved';
    
    return (
      <List.Item>
        <Card 
          hoverable 
          className="template-card"
          style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            borderLeft: formattedTemplate.isLocked ? '4px solid #faad14' : '4px solid #52c41a'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
            <Avatar 
              icon={getTemplateIcon(template)} 
              size={50}
              style={{ 
                backgroundColor: '#f0f2f5', 
                color: '#1890ff', 
                marginRight: 16,
                padding: 5 
              }} 
            />
            <div style={{ flex: 1 }}>
              <Tooltip title={formattedTemplate.title}>
                <Title level={4} ellipsis={{ rows: 1 }} style={{ marginBottom: 4 }}>
                  {formattedTemplate.title}
                </Title>
              </Tooltip>
              <Paragraph ellipsis={{ rows: 2 }} type="secondary">
                {formattedTemplate.description}
              </Paragraph>
            </div>
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <Space wrap>
              {activeTab === "2" && formattedTemplate.categoryId && (
                <Tag color="blue">
                  <FolderOutlined /> {getCategoryNameById(template.category_id, orgCategories)}
                </Tag>
              )}
              {formattedTemplate.isLocked && (
                <Tag color="warning">
                  <LockOutlined /> Locked Sections
                </Tag>
              )}
              {formattedTemplate.hasApprovers && (
                <Tag color="purple">
                  <UserOutlined /> Approvers Required
                </Tag>
              )}
              {!isPublicTemplate && (
                <Tag color={formattedTemplate.status === 'approved' ? 'success' : 'default'}>
                  {formattedTemplate.status}
                </Tag>
              )}
            </Space>
          </div>
          
          <div style={{ marginTop: 'auto' }}>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!isPublicTemplate && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Updated: {formattedTemplate.updatedAt}
                </Text>
              )}
              {isPublicTemplate && <div />}
              <Space>
                <Button 
                  type="text" 
                  icon={<EyeOutlined />} 
                  size="small" 
                  onClick={() => handlePreviewTemplate(template)}
                >
                  Preview
                </Button>
                <Button 
                  type="primary" 
                  size="small" 
                  onClick={() => handleCreateTemplate(formattedTemplate.id)}
                  disabled={!isPublicTemplate && !isApprovedTemplate}
                >
                  Use
                </Button>
                {/* Edit button only for org templates and admins */}
                {!isPublicTemplate && user?.role === 'admin' && formattedTemplate.status === 'draft' && (
                  <Button 
                    type="text" 
                    icon={<EditOutlined />} 
                    size="small"
                    onClick={() => handleEditTemplate(template)}
                  >
                    Edit
                  </Button>
                )}

                {!isPublicTemplate && user?.role === 'admin' && formattedTemplate.status === 'published' && (
                  <Popconfirm
                    title="Archive this template?"
                    description="Archived templates will be moved to the archive section."
                    onConfirm={() => handleArchiveTemplate(template.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button 
                      type="text" 
                      icon={<InboxOutlined />} 
                      size="small"
                    />
                  </Popconfirm>
                )}

                {!isPublicTemplate && user?.role === 'admin' && formattedTemplate.status === 'archived' && (
                  <Popconfirm
                    title="Restore this template?"
                    description="Restored templates will be moved back to the published section."
                    onConfirm={() => handleRestoreTemplate(template.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button 
                      type="text" 
                      icon={<ExportOutlined />} 
                      size="small"
                    />
                  </Popconfirm>
                )}

                {/* Delete button only for org templates and admins */}
                {!isPublicTemplate && user?.role === 'admin' && formattedTemplate?.status === 'draft' && (
                  <Popconfirm
                    title="Delete this template?"
                    description="This action cannot be undone."
                    onConfirm={() => handleDeleteTemplate(template.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button 
                      type="text" 
                      icon={<DeleteOutlined />} 
                      size="small"
                      danger
                    />
                  </Popconfirm>
                )}
              </Space>
            </div>
          </div>
        </Card>
      </List.Item>
    );
  };

  const getCategoryNameById = (categoryId, categoryList) => {
    const category = categoryList.find(c => c.category_id === categoryId);
    return category ? category.category_name : `Category ${categoryId}`;
  };

  const getParentCategoryPath = (categoryId) => {
    const category = orgCategories.find(c => c.category_id === categoryId);
    return category ? category.folder_path : "";
  };

  const getCategoryBreadcrumb = (categoryId) => {
    if (!categoryId) return [];
    
    const breadcrumbs = [];
    let currentCategory = orgCategories.find(c => c.category_id === categoryId);
    
    while (currentCategory) {
      breadcrumbs.unshift({
        id: currentCategory.category_id,
        name: currentCategory.category_name
      });
      
      if (currentCategory.parent_category_id) {
        currentCategory = orgCategories.find(c => c.category_id === currentCategory.parent_category_id);
      } else {
        currentCategory = null;
      }
    }
    
    return breadcrumbs;
  };

  const getSubcategories = (parentCategoryId) => {
    // If parentCategoryId is 0, get root categories (null parent)
    if (parentCategoryId === 0) {
      return orgCategories.filter(category => !category.parent_category_id);
    }
    
    // Otherwise, get direct children of the specified category
    return orgCategories.filter(category => category.parent_category_id === parentCategoryId);
  };

  const handleCategoryClick = (category) => {
    setCurrentCategory({
      id: category.category_id,
      path: category.folder_path
    });
  };

  const handleAddCategory = () => {
    setAddCategoryVisible(true);
  };

  const submitAddCategory = async () => {
    try {
      const values = await addCategoryForm.validateFields();
      
      // In a real implementation, call your API
      await axios.post(`/api/add_category/${user.orgId}`, { 
        category_name: values.categoryName,
        category_prefix: values.categoryPrefix,
        parent_category_id: currentCategory.id === 0 ? null : currentCategory.id,
      });

      // Refresh the category list
      await fetchUserData();

      message.success('Category created successfully');
      addCategoryForm.resetFields();
      setAddCategoryVisible(false);

    } catch (error) {
      console.error("Failed to create category:", error);
      message.error('Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      // In a real implementation, call your API
      await axios.delete(`/api/delete_category`, { 
      data: {
        categoryId: categoryId,
        organization_id: user.orgId,
      }
      });

      // Refresh the category list
      await fetchUserData();
      
      message.success('Category deleted successfully');
      
      // If we deleted the current category, go back to parent
      if (currentCategory.id === categoryId) {
        navigateToParentCategory();
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      message.error('Failed to delete category');
    }
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    editCategoryForm.setFieldsValue({
      categoryName: category.category_name,
      categoryPrefix: category.category_prefix
    });
    setEditCategoryVisible(true);
  };

  const submitEditCategory = async () => {
    try {
      const values = await editCategoryForm.validateFields();
      
      // In a real implementation, call your API
      await axios.put(`/api/update_category/${user.orgId}`, {
        categoryId: selectedCategory.category_id,
        category_name: values.categoryName,
        category_prefix: values.categoryPrefix,
        parent_category_id: selectedCategory.parent_category_id,
      });
      
      // Refresh the category list
      await fetchUserData();
      
      message.success('Category edited successfully');
      editCategoryForm.resetFields();
      setEditCategoryVisible(false);
      
    } catch (error) {
      console.error("Failed to edit category:", error);
      message.error('Failed to edit category');
    }
  };

  const handleMoveCategory = (category) => {
    setSelectedCategory(category);
    moveCategoryForm.setFieldsValue({
      parentCategoryId: category.parent_category_id || 0
    });
    setMoveCategoryVisible(true);
  };

  const submitMoveCategory = async () => {
    try {
      const values = await moveCategoryForm.validateFields();
      
      // In a real implementation, call your API
      await axios.put(`/api/update_category/${user.orgId}`, {
        categoryId: selectedCategory.category_id,
        category_name: selectedCategory.category_name,
        category_prefix: selectedCategory.category_prefix,
        parent_category_id: values.parentCategoryId === 0 ? null : values.parentCategoryId,
      });
      
      // Refresh the category list
      await fetchUserData();
      
      message.success('Category moved successfully');
      moveCategoryForm.resetFields();
      setMoveCategoryVisible(false);
      
    } catch (error) {
      console.error("Failed to move category:", error);
      message.error('Failed to move category');
    }
  };

  const navigateToParentCategory = () => {
    if (currentCategory.id === 0) return;
    
    const currentCategoryObj = orgCategories.find(c => c.category_id === currentCategory.id);
    if (currentCategoryObj && currentCategoryObj.parent_category_id) {
      const parentCategory = orgCategories.find(c => c.category_id === currentCategoryObj.parent_category_id);
      setCurrentCategory({
        id: parentCategory.category_id,
        path: parentCategory.folder_path
      });
    } else {
      // If no parent or parent not found, go to root
      setCurrentCategory({ id: 0, path: "" });
    }
  };

  const navigateToRoot = () => {
    setCurrentCategory({ id: 0, path: "" });
  };

  // Update the templateAction handler to include archive and restore actions
  const handleTemplateAction = (action, template) => {
    switch (action) {
      case 'view':
        handlePreviewTemplate(template);
        break;
      case 'use':
        handleCreateTemplate(template.id);
        break;
      case 'edit':
        handleEditTemplate(template);
        break;
      case 'delete':
        handleDeleteTemplate(template.id);
        break;
      case 'archive':
        handleArchiveTemplate(template.id);
        break;
      case 'restore':
        handleRestoreTemplate(template.id);
        break;
      default:
        break;
    }
  };

  // New function to handle category actions
  const handleCategoryAction = (action, category) => {
    switch (action) {
      case 'open':
        handleCategoryClick(category);
        break;
      case 'edit':
        handleEditCategory(category);
        break;
      case 'move':
        handleMoveCategory(category);
        break;
      case 'delete':
        // Implement delete with confirmation
      if (window.confirm(`Are you sure you want to delete "${category.category_name}"?\n\nThis will also delete all subcategories and move templates to uncategorized.`)) {
        handleDeleteCategory(category.category_id);
      }
        break;
      default:
        break;
    }
  };

const renderCategoryListView = () => {
  // Only show file manager for organization templates
  if (activeTab === "1") {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Empty
          description={
            <Text strong>File manager view is not available for public templates</Text>
          }
        />
        <Button 
          type="primary" 
          onClick={() => setViewMode('blocks')}
          style={{ marginTop: 16 }}
        >
          Switch to Blocks View
        </Button>
      </div>
    );
  }
  
  // Get breadcrumb navigation
  const breadcrumbs = getCategoryBreadcrumb(currentCategory.id);
  
  // Get subcategories of current category
  const subcategories = getSubcategories(currentCategory.id);
  
  // Get templates in current category
  const categoryTemplates = orgTemplates.filter(t => t.category_id === currentCategory.id);
  
  // For root level only, also show templates with no category
  const templatesWithNoCategory = currentCategory.id === 0 ? 
                                orgTemplates.filter(t => !t.category_id) : 
                                [];
  
  // Only display templates that belong to the current category (or uncategorized at root level)
  const allTemplates = [...categoryTemplates, ...(currentCategory.id === 0 ? templatesWithNoCategory : [])];

  return (
    <div className="file-manager-view">
      {/* Always show the navigation controls, regardless of content */}
      <div style={{ marginBottom: 16 }}>
        <Space size="middle">
          <Button 
            icon={<HomeOutlined />} 
            onClick={navigateToRoot}
            disabled={currentCategory.id === 0}
          >
            Home
          </Button>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={navigateToParentCategory}
            disabled={currentCategory.id === 0}
          >
            Back
          </Button>
          {user?.role === 'admin' && (
            <Button 
              type="primary" 
              icon={<FolderAddOutlined />} 
              onClick={handleAddCategory}
            >
              Add Category
            </Button>
          )}
        </Space>
      </div>
      
      {/* Always show Breadcrumb navigation when we're not at root */}
      {breadcrumbs.length > 0 && (
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item onClick={navigateToRoot} style={{ cursor: 'pointer' }}>
            <HomeOutlined /> Home
          </Breadcrumb.Item>
          {breadcrumbs.map((crumb, index) => (
            <Breadcrumb.Item 
              key={crumb.id}
              onClick={() => index < breadcrumbs.length - 1 && setCurrentCategory({ 
                id: crumb.id, 
                path: getParentCategoryPath(crumb.id) 
              })}
              style={{ cursor: index < breadcrumbs.length - 1 ? 'pointer' : 'default' }}
            >
              {crumb.name}
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>
      )}
      
      {/* Categories section - show proper empty state if no subcategories */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>Categories</Title>
        {subcategories.length > 0 ? (
          <List
            bordered
            dataSource={subcategories}
            renderItem={category => (
              <List.Item 
                actions={[
                  user?.role === 'admin' && (
                    <Dropdown
                      overlay={
                        <Menu onClick={({ key }) => handleCategoryAction(key, category)}>
                          <Menu.Item key="edit" icon={<EditOutlined />}>Edit</Menu.Item>
                          <Menu.Item key="move" icon={<ExportOutlined />}>Move</Menu.Item>
                          <Menu.Item key="delete" icon={<DeleteOutlined />} danger>Delete</Menu.Item>
                        </Menu>
                      }
                      trigger={['click']}
                    >
                      <Button type="text" icon={<EllipsisOutlined />} />
                    </Dropdown>
                  )
                ].filter(Boolean)}
              >
                <div 
                  onClick={() => handleCategoryClick(category)} 
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={<FolderOutlined />} 
                        style={{ backgroundColor: '#f0f2f5', color: '#1890ff' }} 
                      />
                    }
                    title={category.category_name}
                    description={`${orgTemplates.filter(t => t.category_id === category.category_id).length} templates`}
                  />
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty 
            description={
              currentCategory.id === 0 ? 
                "No categories found" : 
                "No subcategories in this category"
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
      
      {/* Templates section - always show with proper empty state */}
      <div>
        <Title level={5}>
          {currentCategory.id === 0 ? 
            (allTemplates.length > 0 ? "Uncategorized Templates" : "Templates") : 
            "Templates in this category"}
        </Title>
        {allTemplates.length > 0 ? (
          <List
            bordered
            dataSource={allTemplates}
            renderItem={template => {
              const formattedTemplate = formatTemplateData(template);
              const isPublicTemplate = !template.organization_id;
              const isApprovedTemplate = formattedTemplate.status === 'pm_approved';
              
              return (
                <List.Item
                  actions={[
                    !isPublicTemplate && (
                      <Dropdown
                        overlay={
                          <Menu onClick={({ key }) => handleTemplateAction(key, template)}>

                            {user?.role === 'admin' && (
                            <Menu.Item key="view" icon={<EyeOutlined />}>Preview</Menu.Item>
                            )}

                            <Menu.Item key="use" disabled={!isPublicTemplate && !isApprovedTemplate}>Use</Menu.Item>

                            {user?.role === 'admin' && formattedTemplate.status === 'draft' && (
                            <Menu.Item key="edit" icon={<EditOutlined />}>Edit</Menu.Item>
                            )}

                            {user?.role === 'admin' && formattedTemplate.status === 'published' && (
                              <Menu.Item key="archive" icon={<InboxOutlined />} danger>Archive</Menu.Item>
                            )}

                            {user?.role === 'admin' && formattedTemplate.status === 'archived' && (
                              <Menu.Item key="published" icon={<ExportOutlined />} danger>Restore</Menu.Item>
                            )}

                            {user?.role === 'admin' && formattedTemplate.status === 'draft' && (
                              <Menu.Item key="delete" icon={<DeleteOutlined />} danger>Delete</Menu.Item>
                            )}
                          </Menu>
                        }
                        trigger={['click']}
                      >
                        <Button type="text" icon={<EllipsisOutlined />} />
                      </Dropdown>
                    )
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={getTemplateIcon(template)} 
                        style={{ 
                          backgroundColor: '#f0f2f5', 
                          color: '#1890ff',
                          borderLeft: formattedTemplate.isLocked ? '2px solid #faad14' : '2px solid #52c41a'
                        }} 
                      />
                    }
                    title={
                      <div>
                        {formattedTemplate.title}
                        <Space style={{ marginLeft: 12 }}>
                          {formattedTemplate.isLocked && (
                            <Tag color="warning" style={{ marginLeft: 8 }}>
                              <LockOutlined /> Locked
                            </Tag>
                          )}
                          {formattedTemplate.hasApprovers && (
                            <Tag color="purple">
                              <UserOutlined /> Approvers
                            </Tag>
                          )}
                          {!isPublicTemplate && (
                            <Tag color={formattedTemplate.status === 'approved' ? 'success' : 'default'}>
                              {formattedTemplate.status}
                            </Tag>
                          )}
                        </Space>
                      </div>
                    }
                    description={formattedTemplate.description}
                  />
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty description={
            currentCategory.id === 0 ? 
              "No uncategorized templates" : 
              "No templates in this category"
          } />
        )}
      </div>
    </div>
  );
};

  const renderBlockView = () => {
    if (activeTab === "1") {
      // Public templates - simple list
      return (
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
          dataSource={publicTemplates}
          renderItem={renderTemplateItem}
          locale={{ emptyText: <Empty description="No templates found" /> }}
        />
      );
    } else {
      // Organization templates - grouped by status
      const draftTemplates = orgTemplates.filter(t => 
        ['draft', 'rejected'].includes(t.status)
      );

      const pendingReviewTemplates = orgTemplates.filter(t => 
        ['submitted', 'in_progress', 'for_publish'].includes(t.status)
      );

      const approvedTemplates = orgTemplates.filter(t => 
        t.status === 'published'
      );

      const archivedTemplates = orgTemplates.filter(t => 
        t.status === 'archived'
      );

      // Visible templates based on expanded state
      const visibleDraftTemplates = expandDraft ? draftTemplates : draftTemplates.slice(0, 2);
      const visiblePendingTemplates = expandPending ? pendingReviewTemplates : pendingReviewTemplates.slice(0, 2);
      const visibleApprovedTemplates = expandApproved ? approvedTemplates : approvedTemplates.slice(0, 2);
      const visibleArchivedTemplates = expandArchived ? archivedTemplates : archivedTemplates.slice(0, 2);

      return (
        <div>
          {/* Draft Templates Section */}
          {draftTemplates.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4}>Draft Templates</Title>
                {draftTemplates.length > 2 && (
                  <Button 
                    type="link" 
                    onClick={() => setExpandDraft(!expandDraft)}
                    icon={expandDraft ? <UpOutlined /> : <DownOutlined />}
                  >
                    {expandDraft ? 'Show Less' : 'View All'}
                  </Button>
                )}
              </div>
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
                dataSource={visibleDraftTemplates}
                renderItem={renderTemplateItem}
              />
            </div>
          )}
          
          {/* Pending Review Templates Section */}
          {pendingReviewTemplates.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4}>Pending Approval</Title>
                {pendingReviewTemplates.length > 2 && (
                  <Button 
                    type="link" 
                    onClick={() => setExpandPending(!expandPending)}
                    icon={expandPending ? <UpOutlined /> : <DownOutlined />}
                  >
                    {expandPending ? 'Show Less' : 'View All'}
                  </Button>
                )}
              </div>
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
                dataSource={visiblePendingTemplates}
                renderItem={renderTemplateItem}
              />
            </div>
          )}
          
          {/* Approved Templates Section */}
          {approvedTemplates.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4}>Approved Templates</Title>
                {approvedTemplates.length > 2 && (
                  <Button 
                    type="link" 
                    onClick={() => setExpandApproved(!expandApproved)}
                    icon={expandApproved ? <UpOutlined /> : <DownOutlined />}
                  >
                    {expandApproved ? 'Show Less' : 'View All'}
                  </Button>
                )}
              </div>
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
                dataSource={visibleApprovedTemplates}
                renderItem={renderTemplateItem}
              />
            </div>
          )}
          
          {/* Archived Templates Section */}
          {archivedTemplates.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4}>Archived Templates</Title>
                {archivedTemplates.length > 2 && (<Button 
                    type="link" 
                    onClick={() => setExpandArchived(!expandArchived)}
                    icon={expandArchived ? <UpOutlined /> : <DownOutlined />}
                  >
                    {expandArchived ? 'Show Less' : 'View All'}
                  </Button>
                )}
              </div>
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
                dataSource={visibleArchivedTemplates}
                renderItem={renderTemplateItem}
              />
            </div>
          )}
          
          {/* Empty state */}
          {orgTemplates.length === 0 && (
            <Empty description="No organization templates available" />
          )}
        </div>
      );
    }
  };

  // List of available parent categories for moving
  const getAvailableParentCategories = () => {
    if (!selectedCategory) return orgCategories;
    
    // Find all category IDs that are descendants of the selected category
    const findDescendantIds = (categoryId) => {
      const directChildren = orgCategories
        .filter(c => c.parent_category_id === categoryId)
        .map(c => c.category_id);
      
      let allDescendants = [...directChildren];
      
      for (const childId of directChildren) {
        allDescendants = [...allDescendants, ...findDescendantIds(childId)];
      }
      
      return allDescendants;
    };
    
    const descendantIds = findDescendantIds(selectedCategory.category_id);
    
    // Filter out the category itself and all its descendants
    return orgCategories.filter(c => 
      c.category_id !== selectedCategory.category_id && 
      !descendantIds.includes(c.category_id)
    );
  };

  return (
    <div className="templates-dashboard">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Document Templates</Title>
          <Space>
            <Radio.Group 
              value={viewMode} 
              onChange={e => setViewMode(e.target.value)}
              buttonStyle="solid"
              optionType="button"
            >
              <Radio.Button value="blocks">
                <AppstoreOutlined /> Blocks
              </Radio.Button>
              <Radio.Button value="folders" disabled={activeTab === "1"}>
                <BarsOutlined /> Categories
              </Radio.Button>
            </Radio.Group>
            
            {/* {user?.role === 'admin' && activeTab === "2" && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => handleCreateTemplate()}
              >
                Create Template
              </Button>
            )} */}
          </Space>
        </div>

        <Tabs 
          defaultActiveKey="2" 
          onChange={(key) => {
            setActiveTab(key);
            setCurrentCategory({ id: 0, path: "" }); // Reset folder view when changing tabs
            if (key === "1") setViewMode('blocks'); // Force blocks view for public templates
          }}
        >
          {/* <TabPane 
            tab={
              <span>
                <GlobalOutlined /> Public Templates
              </span>
            } 
            key="1"
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : publicTemplates.length === 0 ? (
              <Empty description="No public templates available" />
            ) : (
              viewMode === 'blocks' ? renderBlockView() : renderCategoryListView()
            )}
          </TabPane> */}
          
          <TabPane 
            tab={
              <span>
                <TeamOutlined /> Organization Templates
              </span>
            } 
            key="2"
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : (
              viewMode === 'blocks' ? renderBlockView() : renderCategoryListView()
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* Add Category Modal */}
      <Modal
        title="Add New Category"
        open={addCategoryVisible}
        onCancel={() => setAddCategoryVisible(false)}
        onOk={submitAddCategory}
      >
        <Form
          form={addCategoryForm}
          layout="vertical"
        >
          <Form.Item
            name="categoryName"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter a category name' }]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>
          
          <Form.Item
            name="categoryPrefix"
            label="Category Prefix"
            rules={[{ required: true, message: 'Please enter a category prefix' }]}
          >
            <Input placeholder="Enter new category prefix" />
          </Form.Item>

          {/* Show current parent folder information */}
          <Form.Item label="Parent Folder">
            <Input 
              value={currentCategory.id === 0 ? "Root Level" : getCategoryNameById(currentCategory.id, orgCategories)} 
              disabled 
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        title="Edit Category"
        open={editCategoryVisible}
        onCancel={() => setEditCategoryVisible(false)}
        onOk={submitEditCategory}
      >
        <Form
          form={editCategoryForm}
          layout="vertical"
        >
          <Form.Item
            name="categoryName"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter a category name' }]}
          >
            <Input placeholder="Enter new category name" />
          </Form.Item>

          <Form.Item
            name="categoryPrefix"
            label="Category Prefix"
            rules={[{ required: true, message: 'Please enter a category prefix' }]}
          >
            <Input placeholder="Enter new category prefix" />
          </Form.Item>

        </Form>
      </Modal>

      {/* Move Category Modal */}
      <Modal
        title="Move Category"
        open={moveCategoryVisible}
        onCancel={() => setMoveCategoryVisible(false)}
        onOk={submitMoveCategory}
      >
        <Form
          form={moveCategoryForm}
          layout="vertical"
        >
          <Form.Item
            name="parentCategoryId"
            label="New Parent Category"
            rules={[{ required: true, message: 'Please select a parent category' }]}
          >
            <Select placeholder="Select parent category">
              <Option value={0}>Root Level</Option>
              {getAvailableParentCategories().map(category => (
                <Option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      {/* Template Preview Modal */}
      <TemplatePreviewModal
        visible={previewModalVisible}
        template={selectedTemplate}
        onClose={() => setPreviewModalVisible(false)}
        categories={orgCategories}
        users={users} // Replace with your users data if available
        departments={departments} // Replace with your departments data if available
      />
    </div>
  );
};

const TemplatePreviewModal = ({ 
  visible, 
  template, 
  onClose, 
  categories, 
  users,
  departments 
}) => {
  const [loading, setLoading] = useState(false);
  const [renderedContent, setRenderedContent] = useState(null);

  // Parse the template data to extract necessary information
  const parsedTemplate = React.useMemo(() => {
    if (!template) return null;
    
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
    
    return {
      ...template,
      approvers,
      lockedElements,
      includeTableOfContents,
      allowAttachments
    };
  }, [template]);

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
  
  // Enhanced content renderer
  const renderTemplateContent = () => {
    if (!parsedTemplate?.content) return null;
    
    try {
      // Parse the content JSON
      let contentObj;
      if (typeof parsedTemplate.content === 'string') {
        contentObj = JSON.parse(parsedTemplate.content);
      } else {
        contentObj = parsedTemplate.content;
      }
      
      // If content is nested in a content property (as in your sample data)
      const actualContent = contentObj.content || contentObj;
      
      // Create document viewer container
      return (
        <div className="document-viewer">
          <div className="document-page" style={{
            backgroundColor: 'white',
            padding: '30px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            margin: '0 auto',
            maxWidth: '800px',
            minHeight: '1000px',
            position: 'relative'
          }}>
            <div 
              className="document-content"
              dangerouslySetInnerHTML={{ __html: actualContent }} 
              style={{
                fontFamily: '"Work Sans", "Open Sans", Arial, sans-serif',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#333'
              }}
            />
          </div>
        </div>
      );
    } catch (e) {
      console.error("Error rendering content:", e);
      // Fallback to basic rendering
      return (
        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <Alert
            message="Content Rendering Error"
            description="Could not properly render the template content. Displaying raw content instead."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
            {parsedTemplate.content}
          </pre>
        </div>
      );
    }
  };

  // Function to render approvers table with due date
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

  useEffect(() => {
    if (visible && template) {
      setLoading(true);
      // Simulate loading template content
      setTimeout(() => {
        // Prepare content for rendering
        setRenderedContent(renderTemplateContent());
        setLoading(false);
      }, 800);
    }
  }, [visible, template]);

  if (!parsedTemplate) return null;

  return (
    <Modal
      visible={visible}
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            icon={getTemplateIcon(parsedTemplate)} 
            size={40}
            style={{ 
              backgroundColor: '#f0f2f5', 
              color: '#1890ff', 
              marginRight: 16
            }} 
          />
          <span>Template Preview: {parsedTemplate.name || parsedTemplate.title}</span>
        </div>
      }
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
      styles={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading template preview...</div>
        </div>
      ) : (
        <div className="template-preview-content">
          <Tabs defaultActiveKey="content">
            <TabPane tab="Overview" key="overview">
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
            </TabPane>
            
            <TabPane tab="Content" key="content">
              <Card bordered={false}>
                <Alert
                  message="Preview Mode"
                  description="This is a preview of how the template will appear to users. Content may be adjusted based on user permissions."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <div className="template-content-preview">
                  {renderedContent || (
                    <div style={{ textAlign: 'center', color: '#999', padding: 80 }}>
                      <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                      <p>Content preview not available</p>
                    </div>
                  )}
                </div>
              </Card>
            </TabPane>
            
            <TabPane tab="Structure" key="structure">
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
    </Modal>
  );
};

export default Templates;