import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import TemplateEditor from "./TemplateEditor/TemplateEditor";
import { successAlert, errorAlert, toastAlert } from '../../../../../utils/alerts';
import { 
  Card, Form, Input, Button, Steps, Select, Switch, Checkbox, 
  Row, Col, Tag, Typography, Alert, Divider, Table, Space, 
  Tabs, message, Badge, Dropdown, Modal, Empty, Tooltip
} from 'antd';
import { 
  FileTextOutlined, SaveOutlined, PlusOutlined, 
  UserOutlined, TeamOutlined, SettingOutlined, ArrowUpOutlined, 
  ArrowDownOutlined, FileTextTwoTone, TeamOutlined as TeamOutlinedTwo, 
  LockOutlined as LockOutlinedTwo, EditOutlined, FileSearchOutlined, 
  MessageOutlined, LeftOutlined, RightOutlined, DownOutlined, DeleteOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const CreateTemplate = ({ onSuccess, user, users, categories, departments }) => {
  const [form] = Form.useForm();
  const [filterCategory, setCategory] = useState();
  const [contentData, setContentData] = useState(null);
  const [activeTab, setActiveTab] = useState("basicInfo");
  const [approvers, setApprovers] = useState([]);
  const [lockedElements, setLockedElements] = useState({
    content: false,
    fontSize: false,
    fontStyle: false,
    borders: false,
    headerFooter: false
  });
  const [currentTemplateId, setCurrentTemplateId] = useState(null);
  const [impactData, setImpactData] = useState({
    departmentImpacts: [],
    affectedSystems: [],
    implementationEffort: 'medium',
    trainingRequired: false
  });
  const [tabStatus, setTabStatus] = useState({
    basicInfo: "incomplete",
    approvers: "incomplete",
    structure: "incomplete",
    content: "incomplete",
    notes: "incomplete", 
    impact: "incomplete",
    review: "incomplete"
  });
  const [templateApproversModalVisible, setTemplateApproversModalVisible] = useState(false);
  const [templateApprovers, setTemplateApprovers] = useState([]);
  const [selectedTemplateApprover, setSelectedTemplateApprover] = useState(null);

  // Auto-save timer setup
  useEffect(() => {
    // Only set up auto-save if we have something to save
    if (form.getFieldValue('name') || contentData || approvers.length > 0 || impactData.departmentImpacts.length > 0) {
      // Initial save if needed
      if (!currentTemplateId && form.getFieldValue('name')) {
        handleSubmit('draft', true);
      }
      
      const autoSaveTimer = setInterval(() => {
        if (currentTemplateId || form.getFieldValue('name')) {
          handleSubmit('draft', true);
        }
      }, 20000); // Auto-save every 20 seconds
      
      return () => clearInterval(autoSaveTimer);
    }
  }, [form.getFieldValue('name'), contentData, approvers.length, impactData, currentTemplateId]);

  // Validate fields on tab change
  const validateTabFields = async (tab) => {
    try {
      // Define which fields to validate for each tab
      const tabFieldMapping = {
        basicInfo: ['name', 'description', 'category'],
        approvers: [], // We'll handle approvers validation separately
        structure: [], // No required fields in structure tab
        content: [], // Content tab validation will depend on your implementation
        impact: [], // Impact are optional
        notes: [], // Notes are optional
        review: [] // Review tab doesn't have form fields to validate
      };

      // Get fields for the current tab
      const fields = tabFieldMapping[tab];
      
      if (!fields || fields.length === 0) {
        // If no fields to validate or they're optional, mark as complete
        setTabStatus(prev => ({ ...prev, [tab]: "complete" }));
        return true;
      }

      // Validate specific fields
      await form.validateFields(fields);
      
      // If validation succeeds, mark tab as complete
      setTabStatus(prev => ({ ...prev, [tab]: "complete" }));
      return true;
    } catch (error) {
      console.log("Validation error:", error);
      // If validation fails, tab remains incomplete
      setTabStatus(prev => ({ ...prev, [tab]: "incomplete" }));
      return false;
    }
  };

  // Function to handle adding template approvers
  const handleAddTemplateApprover = (userId) => {
    // Check if user already exists in the template approvers
    if (!templateApprovers.some(approver => approver.userId === userId)) {
      const user = users.find(u => u.id === userId);
      if (user) {
        setTemplateApprovers([
          ...templateApprovers,
          {
            userId,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            department: user.department || '',
            role: "template_approver"
          }
        ]);
      }
    }
    setSelectedTemplateApprover(null); // Reset selection
  };

  // Function to remove template approver
  const handleRemoveTemplateApprover = (userId) => {
    setTemplateApprovers(templateApprovers.filter(approver => approver.userId !== userId));
  };

  // Function to open the template approvers modal
  const showTemplateApproversModal = () => {
    setTemplateApproversModalVisible(true);
  };

  // Function to close the template approvers modal
  const handleTemplateApproversModalCancel = () => {
    setTemplateApproversModalVisible(false);
  };

  // Check if at least one user is assigned for each approver
  useEffect(() => {
    // First check if there are any approvers at all
    const hasApprovers = approvers.length > 0;
    
    // Then check if all approvers have at least one participant
    const allApproversHaveParticipants = hasApprovers && 
      approvers.every(approver => (approver.participants || []).length > 0);
    
    setTabStatus(prev => ({ 
      ...prev, 
      approvers: hasApprovers ? "complete" : "incomplete" 
    }));
  }, [approvers]);

  // Track if all required tabs are complete for submission
  const canSubmit = Object.entries(tabStatus)
    .filter(([key]) => key !== 'notes') // Notes tab is optional
    .every(([_, status]) => status === "complete");

  const approverColumns = [
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 250, 
      render: (_, record) => {
        // Get already selected departments (excluding current record)
        const selectedDepartments = approvers
          .filter(approver => approver.key !== record.key)
          .map(approver => approver.department);
        
        // Filter available departments
        const availableDepartments = departments.filter(
          dept => !selectedDepartments.includes(dept.name)
        );
        
        // If current department is selected but not in available list, add it back
        const deptOptions = [
          ...availableDepartments,
          ...(record.department && 
            !availableDepartments.some(d => d.name === record.department) ? 
            [departments.find(d => d.name === record.department)] : 
            []
          )
        ].filter(Boolean);
        
        return (
          <Select
            value={record.department}
            style={{ width: '100%' }}
            onChange={(value) => handleApproverDepartmentChange(record.key, value)}
          >
            {deptOptions.map(dept => (
              <Option key={dept.id} value={dept.name}>{dept.name}</Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: 'Mandatory',
      dataIndex: 'mandatory',
      key: 'mandatory',
      width: 120, 
      render: (_, record) => (
        <Tooltip title="When checked, the document cannot proceed to the next stage without this department's approval">
          <Checkbox 
            checked={record.mandatory} 
            onChange={(e) => handleApproverChange(record.key, 'mandatory', e.target.checked)}
          />
        </Tooltip>
      )
    },    
{
  title: 'Stage',
  dataIndex: 'stage',
  key: 'stage',
  width: 150, 
  render: (_, record) => {
    // Get all available stages (current stages + 1 more)
    const existingStages = [...new Set(approvers.map(a => a.stage))].sort((a, b) => a - b);
    const maxStage = Math.max(...existingStages, 0);
    
    // Generate available stage options (all existing stages plus up to maxStage+1)
    // This prevents gaps while allowing multiple approvers at the same stage
    const stageOptions = [];
    for (let i = 1; i <= maxStage + 1; i++) {
      stageOptions.push(i);
    }
    
    return (
      <Select
        value={record.stage}
        style={{ width: 80 }}
        onChange={(value) => {
          // Update the stage for this approver
          const updatedApprovers = approvers.map(approver => {
            if (approver.key === record.key) {
              return { ...approver, stage: value };
            }
            return approver;
          });
          setApprovers(updatedApprovers);
        }}
      >
        {stageOptions.map(stage => (
          <Option key={stage} value={stage}>
            {stage}
          </Option>
        ))}
      </Select>
    );
  }
},
    {
      title: '',
      key: 'action',
      width: 80, 
      render: (_, record) => (
        <Button type="link" icon={<DeleteOutlined/>} danger onClick={() => removeApprover(record.key)}></Button>
      ),
    },
  ];

  // Update display-only columns for the review tab
  const displayApproverColumns = [
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (text) => <span>{text}</span>,
    },
    {
      title: 'Mandatory',
      dataIndex: 'mandatory',
      key: 'mandatory',
      render: (text) => (
        <Tag color={text ? 'green' : 'red'}>
          {text ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (text) => <Tag>{text}</Tag>,
    },
  ];

  const handleApproverDepartmentChange = (key, value) => {
    // Update state
    const updatedApprovers = approvers.map(approver => {
      if (approver.key === key) {
        return { 
          ...approver, 
          department: value,
          participants: [] // Clear participants when department changes
        };
      }
      return approver;
    });
    
    setApprovers(updatedApprovers);
  };

  // Navigation between tabs
  const navigateToTab = (direction) => {
    const tabs = ["basicInfo", "approvers", "structure", "content", "notes", "impact", "review"];
    const currentIndex = tabs.indexOf(activeTab);
    
    if (direction === 'next' && currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1];
      handleTabChange(nextTab);
    } else if (direction === 'prev' && currentIndex > 0) {
      const prevTab = tabs[currentIndex - 1];
      handleTabChange(prevTab);
    }
  };

  const handleTabChange = async (key) => {
    // If the current tab has validation, validate it first
    if (activeTab) {
      const isValid = await validateTabFields(activeTab);
      // Even if not valid, we still allow changing tabs
    }
    
    // Mark the tab as viewed
    if (tabStatus[key] === "incomplete" && 
        (key === "structure" || key === "content" || key === "notes" || key === "review")) {
      setTabStatus(prev => ({ ...prev, [key]: "complete" }));
    }
    
    setActiveTab(key);
  };

  const validateAllTabs = async () => {
    const allTabs = ["basicInfo", "approvers", "structure", "content", "notes", "impact"];
    let isValid = true;
    
    for (const tab of allTabs) {
      const valid = await validateTabFields(tab);
      if (!valid) isValid = false;
    }
    
    return isValid;
  };

  // Explicitly structure data for submission
  const handleSubmit = (status = 'submitted', isAutoSave = false) => {
    // For submitted status, validate all tabs
    if (status === 'submitted' && !isAutoSave) {
      validateAllTabs().then(isValid => {
        if (!isValid) {
          errorAlert('Submission Failed','Please complete all required fields before submitting');
          return;
        }
        saveTemplateData(status);
        successAlert('Template Submitted', `Template Submission Success`);
      });
    } else {
      // For draft or auto-save, skip validation
      saveTemplateData(status, isAutoSave);
      if (!isAutoSave) {
        toastAlert('Template Saved as Draft');
      }
    }
  };

// Save template data
  const saveTemplateData = (status, isAutoSave = false) => {
    const formValues = form.getFieldsValue(true);
    // Create a completely structured object with all expected data
    const templateData = {
      // Basic template info
      name: formValues.name,
      description: formValues.description,
      category_id: formValues.category,
      
      // User and org info
      created_by: user?.id,
      organization_id: user?.orgId,
      
      // Template approvers - formatted as JSON string for database
      template_approvers: status === 'submitted' ? templateApprovers : null,
      
      // Approvers and locked elements from state
      approvers: approvers,
      locked_elements: lockedElements,
      
      // Content structure settings
      includeTableOfContents: formValues.includeTableOfContents || false,
      allowAttachments: formValues.allowAttachments || false,
      
      // Content data
      content: contentData || {},

      // Notes/Remarks
      notes: formValues.notes || '',
      
      // Impact assessment data
      impact: impactData || {},
      
      // Status - new field
      status: status
    };
    
    if (isAutoSave) {
      // Only show message if not initial save
      if (currentTemplateId) {
        toastAlert('Template auto-saved');
      }
    }

    // If we already have a template ID, update it. Otherwise create new
    if (currentTemplateId) {
      updateExistingTemplate(templateData, status, isAutoSave);
    } else {
      createNewTemplate(templateData, status, isAutoSave);
    }
  };

  // Function to create a new template
  const createNewTemplate = async (templateData, status, isAutoSave) => {
    try {
      const response = await axios.post('/api/newtemplate', templateData);
      
      if (response.data.success) {
        // Store the template ID for future updates
        setCurrentTemplateId(response.data.templateId);
        
        if (!isAutoSave) {
          // Only show notification for user-initiated saves
          successAlert('Template Created', `Template has been created successfully`);
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Error creating template:', error);
      if (!isAutoSave) {
        // Only show error for user-initiated saves
        errorAlert('Creation Failed', error.response?.data?.message || 'There was an error creating your template');
      }
    }
  };

  // Function to update an existing template
  const updateExistingTemplate = async (templateData, status, isAutoSave) => {
    try {
      const response = await axios.put(`/api/update_template/${currentTemplateId}`, templateData);
      
      if (response.data.success) {
        if (!isAutoSave) {
          // Only show notification for user-initiated saves
          successAlert('Template Saved', `Template has been created successfully`);
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Error updating template:', error);
      if (!isAutoSave) {
        // Only show error for user-initiated saves
        errorAlert('Submission Failed', error.response?.data?.message || 'There was an error creating your template');
      }
    }
  };

  // Dropdown menu items
  const items = [
    {
      key: 'submit',
      label: 'Submit',
      icon: <SaveOutlined />,
      onClick: () => showTemplateApproversModal()
    },
    {
      key: 'draft',
      label: 'Save as Draft',
      icon: <FileTextOutlined />,
      onClick: () => handleSubmit('draft')
    }
  ];

  // Add approver function
const addApprover = () => {
  // Get already selected departments
  const selectedDepartments = approvers.map(approver => approver.department);
  
  // Check if there are any unselected departments left
  const availableDepartments = departments.filter(
    dept => !selectedDepartments.includes(dept.name)
  );
  
  if (availableDepartments.length === 0) {
    message.warning('All departments have already been assigned as approvers.');
    return;
  }
  
  // Find all existing stages and get the maximum stage number
  const existingStages = approvers.map(a => a.stage);
  const maxStage = existingStages.length > 0 ? Math.max(...existingStages) : 0;
  
  // Default to stage 1 for the first approver, otherwise use the latest stage
  const nextStage = maxStage > 0 ? maxStage : 1;
  
  const newApprover = {
    key: approvers.length,
    department: availableDepartments[0]?.name || '',
    mandatory: false,
    stage: nextStage,
    participants: []
  };
  
  setApprovers([...approvers, newApprover]);
};

  // Remove approver function
  const removeApprover = (key) => {
    const approverToRemove = approvers.find(a => a.key === key);
    if (!approverToRemove) return;
    
    const removedStage = approverToRemove.stage;
    
    // Remove the approver
    const filteredApprovers = approvers.filter(approver => approver.key !== key);
    
    // Adjust stages for remaining approvers
    const updatedApprovers = filteredApprovers.map(approver => {
      if (approver.stage > removedStage) {
        return { ...approver, stage: approver.stage - 1 };
      }
      return approver;
    });
    
    // Sort by stage
    const sortedApprovers = [...updatedApprovers].sort((a, b) => a.stage - b.stage);
    
    // Update keys to be sequential
    const reindexedApprovers = sortedApprovers.map((approver, index) => ({
      ...approver,
      key: index
    }));
    
    setApprovers(reindexedApprovers);
  };

  const handleApproverChange = (key, field, value) => {
    setApprovers(approvers.map(approver => {
      if (approver.key === key) {
        return { ...approver, [field]: value };
      }
      return approver;
    }));
  };

  const handleLockElementToggle = (element) => {
    setLockedElements({
      ...lockedElements,
      [element]: !lockedElements[element]
    });
  };
    
  // Function to get parent names excluding current category
  const getParentPath = (folder_path, currentId) => {
    if (!folder_path) return [];
    
    return folder_path.split('/')
      .filter(id => id != currentId) // Exclude current category ID
      .map(id => {
        const cat = categories.find(c => c.category_id == id);
        return cat ? cat.category_name : null;
      })
      .filter(Boolean)
      .reverse(); // Show nearest parent first
  };

  // Get tab status badge color
  const getTabStatusColor = (tabKey) => {
    return tabStatus[tabKey] === "complete" ? "success" : "error";
  };

  // Initialize form with values for locked elements
  useEffect(() => {
    form.setFieldsValue({
      // Set initial values for form fields
      lockContent: lockedElements.content,
      lockFontSize: lockedElements.fontSize,
      lockFontStyle: lockedElements.fontStyle,
      lockBorders: lockedElements.borders,
      lockHeaderFooter: lockedElements.headerFooter,
      includeTableOfContents: false,
      allowAttachments: false,
    });
  }, [form]);

  // Effects for form-state synchronization
  useEffect(() => {
    // Update form values when lockedElements state changes
    form.setFieldsValue({
      lockContent: lockedElements.content,
      lockFontSize: lockedElements.fontSize,
      lockFontStyle: lockedElements.fontStyle,
      lockBorders: lockedElements.borders,
      lockHeaderFooter: lockedElements.headerFooter,
    });
  }, [lockedElements, form]);

  // Tab navigation buttons
  const renderTabNavButtons = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
      <Space>
        <Button 
          icon={<LeftOutlined />} 
          onClick={() => navigateToTab('prev')}
          disabled={activeTab === "basicInfo"}
        >
          Previous
        </Button>
        <Button 
          type="primary" 
          onClick={() => navigateToTab('next')}
          disabled={activeTab === "review"}
        >
          Next <RightOutlined />
        </Button>
        {activeTab === "review" && (
          <Dropdown menu={{ items }} placement="bottomRight">
            <Button type="primary">
              Create Template <DownOutlined />
            </Button>
          </Dropdown>
        )}
      </Space>
    </div>
  );

  // Basic information tab content
  const renderBasicInfoTab = () => (
    <Card bordered={false} title="Basic Template Information">
      <Form.Item
        name="name"
        label="Template Name"
        rules={[{ required: true, message: 'Please enter a template name' }]}
      >
        <Input placeholder="Enter template name" size="large" />
      </Form.Item>
      
      <Form.Item
        name="description"
        label="Description"
        rules={[{ required: true, message: 'Please provide a description' }]}
      >
        <TextArea rows={4} placeholder="Describe what this template is used for and any important details" />
      </Form.Item>
      
      <Form.Item
        name="category"
        label="Template Category"
      >
        <Select 
          placeholder="Select a category"                
          value={filterCategory}
          onChange={(value) => setCategory(value)}
          allowClear
        >
          {categories.map(category => {
            const parentPath = getParentPath(category.folder_path, category.category_id);
            
            return (
              <Option key={category.category_id} value={category.category_id}>
                <span style={{ fontWeight: 500 }}>{category.category_name}</span>
                {parentPath.length > 0 && (
                  <span style={{
                    color: '#888',
                    fontSize: '0.85em',
                    marginLeft: '6px',
                    fontWeight: 'normal'
                  }}>
                    (in {parentPath.join(' › ')})
                  </span>
                )}
              </Option>
            );
          })}
        </Select>
      </Form.Item>
    </Card>
  );

  // Approvers tab content
  const renderApproversTab = () => (
    <Card 
    bordered={false} 
    title=
      <span>
        Template Approvers Configuration 
          <Tooltip title="Define which departments must approve documents created from this template, whether their approval is mandatory, and at which stage they should review the document.">
            <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Tooltip>
      </span>
    >
      
      <Row style={{ marginBottom: '16px' }}>
        <Col span={24}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={addApprover}
            disabled={departments.length <= approvers.length}
          >
            Add Approver
          </Button>
        </Col>
      </Row>
      
      <Table 
        columns={approverColumns} 
        dataSource={approvers}
        pagination={false}
        size="middle"
      />
      
      <Divider />
      
      <Paragraph type="secondary">
        <Text strong>Note:</Text> The Mandatory field determines if approval from this department is required. 
        The Stage field determines the order in which people will review the document.
      </Paragraph>
    </Card>
  );

  // Structure tab content
  const renderStructureTab = () => (
    <Card 
    bordered={false} 
    title=
      <span>
        Template Structure and Locked Elements 
          <Tooltip 
            title="Define which elements of the template should be locked and cannot be modified by users."
            >
            <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Tooltip>
      </span>
    >      
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small" title="Content Locking">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Form.Item name="lockContent" valuePropName="checked" noStyle>
                  <Switch 
                    checked={lockedElements.content}
                    onChange={() => handleLockElementToggle('content')}
                  />
                </Form.Item>
                <Text> Lock Table Content</Text>
              </div>
              <div>
                <Form.Item name="lockFontSize" valuePropName="checked" noStyle>
                  <Switch 
                    checked={lockedElements.fontSize}
                    onChange={() => handleLockElementToggle('fontSize')}
                  />
                </Form.Item>
                <Text> Lock Font Size</Text>
              </div>
              <div>
                <Form.Item name="lockFontStyle" valuePropName="checked" noStyle>
                  <Switch 
                    checked={lockedElements.fontStyle}
                    onChange={() => handleLockElementToggle('fontStyle')}
                  />
                </Form.Item>
                <Text> Lock Font Style</Text>
              </div>
              <div>
                <Form.Item name="lockBorders" valuePropName="checked" noStyle>
                  <Switch 
                    checked={lockedElements.borders}
                    onChange={() => handleLockElementToggle('borders')}
                  />
                </Form.Item>
                <Text> Lock Borders</Text>
              </div>
              <div>
                <Form.Item name="lockHeaderFooter" valuePropName="checked" noStyle>
                  <Switch 
                    checked={lockedElements.headerFooter}
                    onChange={() => handleLockElementToggle('headerFooter')}
                  />
                </Form.Item>
                <Text> Lock Header/Footer</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Table of Contents">
            <Form.Item
              name="includeTableOfContents"
              valuePropName="checked"
              initialValue={false}
            >
              <Checkbox>Include Table of Contents (Index)</Checkbox>
            </Form.Item>
            <Text type="secondary">
              A table of contents will be automatically generated based on the document structure.
            </Text>
          </Card>
          
          <Card size="small" title="Attachments" style={{ marginTop: '16px' }}>
            <Form.Item
              name="allowAttachments"
              valuePropName="checked"
              initialValue={false}
            >
              <Checkbox>Allow File Attachments</Checkbox>
            </Form.Item>
          </Card>
        </Col>
      </Row>
    </Card>
  );

  // Content tab (integrating with external content editor)
  const renderContentTab = () => (
    <Card 
    bordered={false} 
    title=
      <span>
        Template Content 
          <Tooltip 
        title="Configure the template content structure and default values."
            >
            <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Tooltip>
      </span>
    >            
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <TemplateEditor 
          user={user}
          onContentChange={setContentData}
        />
      </div>
    </Card>
  );

  const renderImpactTab = () => (
    <Card 
    bordered={false} 
    title=
      <span>
        Department Impact Assessment 
          <Tooltip 
        title="Assess how this template will impact different departments and systems within the organization."
            >
            <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Tooltip>
      </span>
    >                  
      <Form.Item
        name="departmentImpacts"
        label="Impacted Departments"
      >
        <Select
          mode="multiple"
          placeholder="Select departments impacted by this template"
          value={impactData.departmentImpacts}
          onChange={(values) => setImpactData({...impactData, departmentImpacts: values})}
          style={{ width: '100%' }}
        >
          {departments.map(dept => (
            <Option key={dept.id} value={dept.name}>{dept.name}</Option>
          ))}
        </Select>
      </Form.Item>
      
      <Form.Item
        name="affectedSystems"
        label="Affected Systems/Processes"
      >
        <Select
          mode="tags"
          placeholder="Select or add affected systems or processes"
          value={impactData.affectedSystems}
          onChange={(values) => setImpactData({...impactData, affectedSystems: values})}
          style={{ width: '100%' }}
        >
          <Option value="accounting">Accounting System</Option>
          <Option value="crm">CRM</Option>
          <Option value="hr">HR Management</Option>
          <Option value="procurement">Procurement</Option>
          <Option value="reporting">Reporting</Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        name="implementationEffort"
        label="Implementation Effort"
      >
        <Select
          placeholder="Select implementation effort level"
          value={impactData.implementationEffort}
          onChange={(value) => setImpactData({...impactData, implementationEffort: value})}
          style={{ width: '100%' }}
        >
          <Option value="low">Low - Minimal changes required</Option>
          <Option value="medium">Medium - Moderate process adjustments needed</Option>
          <Option value="high">High - Significant process changes</Option>
          <Option value="veryHigh">Very High - Complete process redesign</Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        name="trainingRequired"
        label="Training Required"
        valuePropName="checked"
      >
        <Switch
          checked={impactData.trainingRequired}
          onChange={(checked) => setImpactData({...impactData, trainingRequired: checked})}
        /> User training will be required for this template
      </Form.Item>
      
      <Form.Item
        name="impactNotes"
        label="Additional Impact Notes"
      >
        <TextArea 
          rows={4} 
          placeholder="Additional notes about department impact or implementation considerations"
          onChange={(e) => setImpactData({...impactData, impactNotes: e.target.value})}
        />
      </Form.Item>
    </Card>
  );

  // Notes/Remarks tab (new tab)
  const renderNotesTab = () => (
    <Card 
    bordered={false} 
    title=
      <span>
        Notes & Remarks 
          <Tooltip 
        title="Add any notes, remarks, or special instructions for this template that administrators might need to know."
            >
            <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Tooltip>
      </span>
    >                  
      <Form.Item
        name="notes"
        label="Admin Notes"
      >
        <TextArea 
          rows={6} 
          placeholder="Enter any additional notes, instructions, or remarks about this template (optional)"
        />
      </Form.Item>
    </Card>
  );

// Review tab content
  const renderReviewTab = () => (
    <Card 
    bordered={false} 
    title=
      <span>
        Review Template Settings 
          <Tooltip 
        title="Please review your template configuration before creating it."
            >
            <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Tooltip>
      </span>
    >                  
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card size="small" title="Basic Information">
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => (
                <>
                  <p><strong>Name:</strong> {getFieldValue('name')}</p>
                  <p><strong>Description:</strong> {getFieldValue('description')}</p>
                  <p><strong>Category:</strong> {
                    categories.find(c => c.category_id === getFieldValue('category'))?.category_name || getFieldValue('category')
                  }</p>
                </>
              )}
            </Form.Item>
          </Card>
        </Col>
        
        <Col span={24}>
          <Card size="small" title="Approvers Configuration">
            <Table 
              columns={displayApproverColumns} 
              dataSource={approvers}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        
        <Col span={24}>
          <Card size="small" title="Locked Elements">
            <ul>
              {Object.entries(lockedElements).map(([key, value]) => (
                value ? <li key={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</li> : null
              ))}
            </ul>
            {!Object.values(lockedElements).some(Boolean) && <Text type="secondary">No elements locked</Text>}
          </Card>
        </Col>
        
        <Col span={24}>
          <Card size="small" title="Structure">
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => (
                <ul>
                  {getFieldValue('includeTableOfContents') && <li>Include Table of Contents (Index)</li>}
                  {getFieldValue('allowAttachments') && <li>Allow File Attachments</li>}
                  {!getFieldValue('includeTableOfContents') && !getFieldValue('allowAttachments') && 
                    <Text type="secondary">No special structure settings</Text>
                  }
                </ul>
              )}
            </Form.Item>
          </Card>
        </Col>

        <Col span={24}>
          <Card size="small" title="Content Configuration">
            <Text type="secondary">Content configuration is set in the Content tab</Text>
          </Card>
        </Col>
        
        <Col span={24}>
          <Card size="small" title="Department Impact Assessment">
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => (
                <>
                  <p><strong>Impacted Departments:</strong> {
                    impactData.departmentImpacts && impactData.departmentImpacts.length > 0 
                      ? impactData.departmentImpacts.map(d => <Tag key={d}>{d}</Tag>) 
                      : <Text type="secondary">No departments specified</Text>
                  }</p>
                  <p><strong>Affected Systems:</strong> {
                    impactData.affectedSystems && impactData.affectedSystems.length > 0 
                      ? impactData.affectedSystems.map(s => <Tag key={s}>{s}</Tag>) 
                      : <Text type="secondary">None specified</Text>
                  }</p>
                  <p><strong>Implementation Effort:</strong> {
                    impactData.implementationEffort ? 
                      <Tag color={
                        impactData.implementationEffort === 'low' ? 'green' : 
                        impactData.implementationEffort === 'medium' ? 'blue' :
                        impactData.implementationEffort === 'high' ? 'orange' : 'red'
                      }>
                        {impactData.implementationEffort}
                      </Tag> : 
                      <Text type="secondary">Not specified</Text>
                  }</p>
                  <p><strong>Training Required:</strong> {
                    <Tag color={impactData.trainingRequired ? 'blue' : 'green'}>
                      {impactData.trainingRequired ? 'Yes' : 'No'}
                    </Tag>
                  }</p>
                  {impactData.impactNotes && (
                    <p><strong>Additional Notes:</strong> {impactData.impactNotes}</p>
                  )}
                </>
              )}
            </Form.Item>
          </Card>
        </Col>

        {/* <Col span={24}>
          <Card size="small" title="Notes & Remarks">
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => (
                <>
                  {getFieldValue('notes') ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{getFieldValue('notes')}</div>
                  ) : (
                    <Text type="secondary">No additional notes provided</Text>
                  )}
                </>
              )}
            </Form.Item>
          </Card>
        </Col> */}
      </Row>
      
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Dropdown menu={{ items }} placement="bottomRight">
          <Button type="primary" disabled={!canSubmit && items[0].key === 'submit'}>
            Create Template <DownOutlined />
          </Button>
        </Dropdown>
        {!canSubmit && (
          <div style={{ color: '#ff4d4f', marginTop: 8 }}>
            Please complete all required fields in the highlighted tabs before submitting
          </div>
        )}
      </div>
    </Card>
  );

  // Render the component
  return (
    <div className="create-template-tabs">
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card bordered={false}>
            <Title level={3}>
              <FileTextOutlined /> Create New Template
            </Title>
            <Text type="secondary">
              Create a new template that serves as the backbone for documents.
              Templates help maintain consistency and define approval workflows.
            </Text>
          </Card>
        </Col>
        
        <Col span={24}>
          {renderTabNavButtons()}
          
          <Form
            form={form}
            layout="vertical"
          >
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              type="card"
              items={[
                {
                  key: "basicInfo",
                  label: (
                    <Badge dot status={getTabStatusColor("basicInfo")} offset={[5, 0]}>
                      <FileTextTwoTone /> Basic Info
                    </Badge>
                  ),
                  children: renderBasicInfoTab()
                },
                {
                  key: "approvers",
                  label: (
                    <Badge dot status={getTabStatusColor("approvers")} offset={[5, 0]}>
                      <TeamOutlinedTwo /> Approvers
                    </Badge>
                  ),
                  children: renderApproversTab()
                },
                {
                  key: "structure",
                  label: (
                    <Badge dot status={getTabStatusColor("structure")} offset={[5, 0]}>
                      <LockOutlinedTwo /> Structure & Locks
                    </Badge>
                  ),
                  children: renderStructureTab()
                },
                {
                  key: "content",
                  label: (
                    <Badge dot status={getTabStatusColor("content")} offset={[5, 0]}>
                      <EditOutlined /> Content
                    </Badge>
                  ),
                  children: renderContentTab()
                },
                {
                  key: "impact",
                  label: (
                    <Badge dot status={getTabStatusColor("impact")} offset={[5, 0]}>
                      <TeamOutlined /> Impact
                    </Badge>
                  ),
                  children: renderImpactTab()
                },                {
                  key: "notes",
                  label: (
                    <Badge dot status={getTabStatusColor("notes")} offset={[5, 0]}>
                      <MessageOutlined /> Notes
                    </Badge>
                  ),
                  children: renderNotesTab()
                },
                {
                  key: "review",
                  label: (
                    <Badge dot status={getTabStatusColor("review")} offset={[5, 0]}>
                      <FileSearchOutlined /> Review
                    </Badge>
                  ),
                  children: renderReviewTab()
                }
              ]}
            />
          </Form>
        </Col>
      </Row>
    <Modal
      title="Select Template Approvers"
      visible={templateApproversModalVisible}
      onCancel={handleTemplateApproversModalCancel}
      footer={[
        <Button key="close" onClick={handleTemplateApproversModalCancel}>
          Close
        </Button>,
        <Button key="submit" onClick={() => handleSubmit('submitted')}>
          Submit
        </Button>

      ]}
      width={700}
    >      
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Add Template Approvers" size="small">
            <Select
              style={{ width: '100%' }}
              placeholder="Select users by email"
              value={selectedTemplateApprover}
              onChange={handleAddTemplateApprover}
              optionLabelProp="label"
              showSearch
              filterOption={(input, option) => 
                option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {users
                .filter(user => !templateApprovers.some(approver => approver.userId === user.id) && user.template_approver === 'yes')
                .map(user => (
                  <Option 
                    key={user.id} 
                    value={user.id}
                    label={user.email}
                  >
                    <div>
                      <div>{user.email}</div>
                      <div style={{ fontSize: 'smaller', color: '#666' }}>{user.first_name} {user.last_name}</div>
                      {user.department && (
                        <div style={{ fontSize: 'smaller', color: '#666' }}>
                          Department: {user.department}
                        </div>
                      )}
                    </div>
                  </Option>
                ))
              }
            </Select>
          </Card>
        </Col>
        
        <Col span={24}>
          <Card title="Selected Template Approvers" size="small">
            {templateApprovers.length > 0 ? (
              <Table
                dataSource={templateApprovers}
                rowKey="userId"
                pagination={false}
                columns={[
                  {
                    title: 'Name',
                    dataIndex: 'name',
                    key: 'name',
                  },
                  {
                    title: 'Email',
                    dataIndex: 'email',
                    key: 'email',
                  },
                  {
                    title: 'Department',
                    dataIndex: 'department',
                    key: 'department',
                  },
                  {
                    title: 'Action',
                    key: 'action',
                    render: (_, record) => (
                      <Button 
                        type="link" 
                        danger 
                        onClick={() => handleRemoveTemplateApprover(record.userId)}
                      >
                        Remove
                      </Button>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty description="No template approvers selected" />
            )}
          </Card>
        </Col>
      </Row>
    </Modal>
    </div>
  );
};

export default CreateTemplate;