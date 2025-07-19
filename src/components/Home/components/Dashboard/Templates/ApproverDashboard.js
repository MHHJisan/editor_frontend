import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Button, Space, Typography, Row, Col, 
  Badge, Empty, Tooltip, Input, Select
} from 'antd';
import {
  EyeOutlined, ClockCircleOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, SearchOutlined, FilterOutlined, 
  SyncOutlined, InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

const ApproverDashboard = ({ user, templates = [], onPreviewTemplate, onRefresh }) => {
  // State for filtering and search
  const [searchText, setSearchText] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(null);

  // Extract unique categories from templates
  const categories = [...new Set(templates
    .map(template => template.category_id)
    .filter(Boolean))];

  // Find templates that require the current user's approval
  useEffect(() => {
    if (!templates || !user) return;
    
    // Filter templates where:
    // 1. The template status is 'submitted' or 'in_progress'
    // 2. The user's ID is in the required_approvers array
    // 3. The user hasn't already approved/rejected
    const pendingTemplates = templates.filter(template => {
      const isApprovalStatus = ['submitted', 'in_progress'].includes(template.status);
      
      // Parse required_approvers if it's a string
      const approvers = typeof template.required_approvers === 'string' 
        ? JSON.parse(template.required_approvers) 
        : template.required_approvers || [];
      
      // Check if user is in the approvers list
      const userIsApprover = approvers.some(approver => {
        // Check in participants if using the structure from the paste.txt file
        if (approver.participants) {
          return approver.participants.some(p => p.userId === user.id && (!p.status || p.status === 'pending'));
        }
        // Or direct check if using simple array
        return approver === user.id;
      });
      
      return isApprovalStatus && userIsApprover;
    });
    
    // Apply search filter if exists
    const filtered = searchText 
      ? pendingTemplates.filter(template => 
          template.name.toLowerCase().includes(searchText.toLowerCase()) ||
          template.description?.toLowerCase().includes(searchText.toLowerCase())
        )
      : pendingTemplates;
    
    // Apply category filter if selected
    const finalFiltered = categoryFilter
      ? filtered.filter(template => template.category_id === categoryFilter)
      : filtered;
      
    setFilteredTemplates(finalFiltered);
  }, [templates, user, searchText, categoryFilter]);

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true);
    onRefresh?.();
    setTimeout(() => setLoading(false), 500); // Simulate loading
  };

  // Get status tag for a template
  const getStatusTag = (status) => {
    switch (status) {
      case 'submitted':
        return <Tag color="processing" icon={<ClockCircleOutlined />}>Submitted</Tag>;
      case 'in_progress':
        return <Tag color="processing" icon={<ClockCircleOutlined />}>In Progress</Tag>;
      case 'for_publish':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>;
      case 'rejected':
        return <Tag color="error" icon={<CloseCircleOutlined />}>Rejected</Tag>;
      case 'published':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Published</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.description && (
            <Text type="secondary" ellipsis={{ tooltip: record.description }}>
              {record.description.length > 50 
                ? `${record.description.substring(0, 50)}...` 
                : record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category_id',
      key: 'category',
      render: (categoryId) => categoryId || 'Uncategorized',
    },
    {
      title: 'Created By',
      dataIndex: 'created_by',
      key: 'creator',
    },
    {
      title: 'Submitted On',
      dataIndex: 'updated_at',
      key: 'submittedDate',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Preview Template">
            <Button 
              icon={<EyeOutlined />} 
              /* onClick={() => onPreviewTemplate(record)} */
            >
              Preview
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4}>
            Templates Pending Your Approval
          </Title>
          <Paragraph type="secondary">
            Review and approve templates that require your attention
          </Paragraph>
        </Col>
        <Col>
          <Space>
            <Search
              placeholder="Search templates" 
              onSearch={handleSearch}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder="Filter by category"
              style={{ width: 180 }}
              allowClear
              onChange={(value) => setCategoryFilter(value)}
            >
              {categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
            <Button 
              icon={<SyncOutlined />} 
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      <Table 
        dataSource={filteredTemplates} 
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        loading={loading}
        locale={{
          emptyText: (
            <Empty 
              description={
                <Space direction="vertical" align="center">
                  <Text>No templates pending your approval</Text>
                  <Text type="secondary">When templates are submitted for approval, they will appear here</Text>
                </Space>
              }
            />
          )
        }}
      />
      
      <div style={{ marginTop: 16 }}>
        <Space align="start">
          <InfoCircleOutlined />
          <div>
            <Text type="secondary">
              Click the "Preview" button to view template details and approve/reject the template.
            </Text>
          </div>
        </Space>
      </div>
    </Card>
  );
};

export default ApproverDashboard;