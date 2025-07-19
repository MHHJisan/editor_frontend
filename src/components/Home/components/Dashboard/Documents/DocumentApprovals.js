import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Typography,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tooltip,
  Divider
} from 'antd';
import { 
  CheckOutlined, 
  CloseOutlined, 
  EyeOutlined, 
  CommentOutlined,
  FilterOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const DocumentApprovals = ({ users, navigate, handleApproveDocument, handleRejectDocument }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [action, setAction] = useState('');
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    status: 'for_approval', // Default filter for documents awaiting approval
  });

  useEffect(() => {
    fetchDocs();
  }, []); // Add empty dependency array here

  const fetchDocs = async () => {
    try {
      const response = await axios.get(`/api/all-docs`);
      setDocuments(response.data);
    } catch (error) {
      console.error("❌ Error fetching documents:", error);
    }
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'in_review': return 'processing';
      case 'for_approval': return 'warning';
      case 'draft': return 'default';
      case 'published': return 'blue';
      default: return 'default';
    }
  };

  // Helper function to get more user-friendly status names
  const getDisplayStatus = (status) => {
    switch(status) {
      case 'in_review': return 'In Review';
      case 'for_approval': return 'Awaiting Approval';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Helper function to get user email from user ID
  const getUserEmail = (userId) => {
    const user = users.find(user => user.id === userId);
    return user ? user.email : 'Unknown';
  };

  // Format documents for table
  const documentsData = documents
    .filter(doc => !filters.status || filters.status === 'all' || doc.status === filters.status)
    .map(doc => ({
      key: doc.document_id,
      title: doc.title,
      status: doc.status,
      submittedBy: getUserEmail(doc.created_by), // Convert user ID to email
      submittedOn: new Date(doc.updated_at).toLocaleDateString(),
    }));

  // Handle opening the approval/rejection modal
  const showActionModal = (document, actionType) => {
    setCurrentDocument(document);
    setAction(actionType);
    setIsModalVisible(true);
    form.resetFields();
  };

  // Handle submitting the approval/rejection
  const handleSubmit = (values) => {
    if (action === 'approve') {
      handleApproveDocument(currentDocument.key, values.comments);
    } else {
      handleRejectDocument(currentDocument.key, values.comments, values.rejectionReason);
    }
    setIsModalVisible(false);
  };

  // Document columns for table
  const documentColumns = [
    {
      title: 'Document',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <Text strong>{text}</Text>,
      sorter: (a, b) => a.title.localeCompare(b.title),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getDisplayStatus(status)}</Tag>
      ),
      filters: [
        { text: 'Awaiting Approval', value: 'for_approval' },
        { text: 'In Review', value: 'in_review' },
        { text: 'Approved', value: 'approved' },
        { text: 'Rejected', value: 'rejected' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Submitted By',
      dataIndex: 'submittedBy',
      key: 'submittedBy',
    },
    {
      title: 'Submitted On',
      dataIndex: 'submittedOn',
      key: 'submittedOn',
      sorter: (a, b) => new Date(a.submittedOn) - new Date(b.submittedOn),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Document">
            <Button 
              icon={<EyeOutlined />} 
              size="small" 
              onClick={() => navigate(`/doc/${record.key}`)}
            />
          </Tooltip>
          {record.status === 'for_approval' && (
            <>
              <Tooltip title="Approve">
                <Button 
                  type="primary"
                  icon={<CheckOutlined />} 
                  size="small"
                  onClick={() => showActionModal(record, 'approve')}
                  style={{ backgroundColor: '#52c41a' }}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button 
                  danger
                  icon={<CloseOutlined />} 
                  size="small"
                  onClick={() => showActionModal(record, 'reject')}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Add Comment">
            <Button 
              icon={<CommentOutlined />} 
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card 
        title="Document Approvals" 
        extra={
          <Space>
            <Select
              placeholder="Filter by status"
              value={filters.status}
              style={{ width: 180 }}
              onChange={(value) => setFilters({...filters, status: value})}
              allowClear
            >
              <Option value="for_approval">Awaiting Approval</Option>
              <Option value="in_review">In Review</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
              <Option value="all">All Documents</Option>
            </Select>
          </Space>
        }
      >
        <Table 
          columns={documentColumns} 
          dataSource={documentsData} 
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50']
          }}
          locale={{
            emptyText: 'No documents found'
          }}
        />
      </Card>

      <Modal
        title={action === 'approve' ? 'Approve Document' : 'Reject Document'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Document: </Text>
            <Text>{currentDocument?.title}</Text>
          </div>

          {action === 'reject' && (
            <Form.Item
              name="rejectionReason"
              label="Reason for Rejection"
              rules={[{ required: true, message: 'Please select a reason for rejection' }]}
            >
              <Select placeholder="Select a reason">
                <Option value="content_issues">Content Issues</Option>
                <Option value="formatting_issues">Formatting Issues</Option>
                <Option value="incomplete_information">Incomplete Information</Option>
                <Option value="incorrect_information">Incorrect Information</Option>
                <Option value="other">Other</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="comments"
            label="Comments"
            rules={[{ required: action === 'reject', message: 'Please provide comments for rejection' }]}
          >
            <TextArea rows={4} placeholder={`Add comments regarding ${action === 'approve' ? 'approval' : 'rejection'}...`} />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                danger={action === 'reject'}
                style={action === 'approve' ? { backgroundColor: '#52c41a' } : {}}
              >
                {action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DocumentApprovals;