import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Button, Space, Typography, Row, Col, 
  Empty, Input, Select, Modal, message, Tooltip
} from 'antd';
import {
  EyeOutlined, SyncOutlined, InfoCircleOutlined, 
  UserOutlined, ClockCircleOutlined, FilterOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

const AdminTemplateMonitoring = ({ templates, users, handlePreviewTemplate, onRefresh }) => {
  // State for filtering and search
  const [searchText, setSearchText] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  // Monitor window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Determine if we're on mobile/tablet or desktop
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // Filter templates to only show submitted templates and apply search
  useEffect(() => {
    if (!templates) return;
    
    // First filter to only show submitted templates
    let filtered = templates.filter(template => template.status === 'submitted');
    
    // Apply search filter if exists
    if (searchText) {
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchText.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
      
    setFilteredTemplates(filtered);
  }, [templates, searchText]);

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
    return <Tag color="processing" icon={<ClockCircleOutlined />}>Submitted</Tag>;
  };

  // Parse and format template approvers
  const getTemplateApprovers = (template) => {
    if (!template.template_approvers) return '-';
    
    try {
      // Parse template_approvers if it's a string
      const approvers = typeof template.template_approvers === 'string' 
        ? JSON.parse(template.template_approvers) 
        : template.template_approvers;
      
      if (!Array.isArray(approvers) || approvers.length === 0) return '-';
      
      return (
        <Space direction="vertical" size={0}>
          {approvers.slice(0, 3).map((approver, index) => (
            <Text key={index}>
              {approver.name} ({approver.department})
            </Text>
          ))}
          {approvers.length > 3 && (
            <Text type="secondary">+{approvers.length - 3} more</Text>
          )}
        </Space>
      );
    } catch (error) {
      console.error("Error parsing template approvers:", error);
      return '-';
    }
  };

  // Define columns based on screen size
  const getColumns = () => {
    // Base columns that always show
    const baseColumns = [
      {
        title: 'Template Name',
        dataIndex: 'name',
        key: 'name',
        fixed: isMobile ? 'left' : undefined,
        render: (text, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{text}</Text>
            {record.description && !isMobile && (
              <Text type="secondary" ellipsis={{ tooltip: record.description }}>
                {record.description.length > (isTablet ? 30 : 50) 
                  ? `${record.description.substring(0, isTablet ? 30 : 50)}...` 
                  : record.description}
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: 'Status',
        key: 'status',
        dataIndex: 'status',
        render: (status) => getStatusTag(status),
      },
      {
        title: 'Created By',
        dataIndex: 'created_by',
        key: 'creator',
        render: (created_by, record) => {
          const creator = users.find(user => user.id === created_by);
          return (
            <Space>
              <UserOutlined />
              <span>
                {creator.first_name} {creator.last_name}
              </span>
            </Space>
          );
        },
      },
      {
        title: 'Template Approvers',
        key: 'templateApprovers',
        render: (_, record) => getTemplateApprovers(record),
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: isMobile ? 'right' : undefined,
        render: (_, record) => (
          <Button 
            icon={<EyeOutlined />}
            size={isMobile ? "small" : "middle"}
            onClick={() => handlePreviewTemplate(record)}
          >
            {!isMobile && "Preview"}
          </Button>
        ),
      }
    ];
    
    return baseColumns;
  };

  return (
    <Card bordered={false}>
      {/* Responsive header */}
      <Row 
        justify="space-between" 
        align={isMobile ? "top" : "middle"} 
        style={{ marginBottom: 16 }}
        gutter={[16, 16]}
      >
        <Col xs={24} md={12}>
          <Title level={4}>Submitted Templates</Title>
          <Paragraph type="secondary">
            Monitor templates that are awaiting approval
          </Paragraph>
        </Col>
        
        <Col xs={24} md={12} style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <Space wrap>
            <Search
              placeholder="Search templates" 
              onSearch={handleSearch}
              style={{ width: isMobile ? '100%' : 200 }}
              allowClear
            />
            <Button 
              icon={<SyncOutlined />} 
              onClick={handleRefresh}
            >
              {!isMobile && "Refresh"}
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Responsive table */}
      <Table 
        dataSource={filteredTemplates} 
        columns={getColumns()}
        rowKey="id"
        pagination={{ 
          pageSize: isMobile ? 5 : isTablet ? 8 : 10,
          size: isMobile ? "small" : "default",
          showSizeChanger: !isMobile
        }}
        loading={loading}
        scroll={{ 
          x: isMobile ? 500 : isTablet ? 800 : 1000,
          y: isMobile ? 400 : undefined
        }}
        size={isMobile ? "small" : "default"}
        locale={{
          emptyText: (
            <Empty description="No submitted templates found" />
          )
        }}
      />
      
      {/* Info section - hidden on small screens */}
      {!isMobile && (
        <div style={{ marginTop: 16 }}>
          <Space align="start">
            <InfoCircleOutlined />
            <div>
              <Text strong>Submitted Templates Information:</Text>
              <ul style={{ paddingLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li><Text>Templates with "Submitted" status are awaiting review</Text></li>
                <li><Text>Use the Preview action to view template details</Text></li>
                <li><Text>The approval process must be completed before templates can be published</Text></li>
              </ul>
            </div>
          </Space>
        </div>
      )}
    </Card>
  );
};

export default AdminTemplateMonitoring;