import React from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Typography,
  Space 
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

const Documents = ({ documents, navigate, handleCreateDocument }) => {
  // Helper function to get status color
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'in progress': return 'processing';
      case 'review': return 'warning';
      case 'planning': return 'cyan';
      default: return 'default';
    }
  };

  // Format documents for table
  const documentsData = documents.map(doc => ({
    key: doc.document_id,
    title: doc.title,
    status: doc.status,
    lastModified: doc.last_modified,
  }));

  // Document columns for table
  const documentColumns = [
    {
      title: 'Document',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Last Modified',
      dataIndex: 'lastModified',
      key: 'lastModified',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            size="small" 
            onClick={() => navigate(`/doc/${record.key}`)}
          >
            Open
          </Button>
          <Button size="small">Share</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title="Document Library" 
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleCreateDocument}
        >
          New Document
        </Button>
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
          emptyText: 'No documents found. Create one to get started!'
        }}
      />
    </Card>
  );
};

export default Documents;