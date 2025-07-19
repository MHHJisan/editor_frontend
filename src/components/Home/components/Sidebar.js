import React from 'react';
import { Layout, Menu, Button, Space, Typography } from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  DashboardOutlined,
  CheckSquareOutlined,
  FileOutlined,
  FolderOutlined,
  CalendarOutlined,
  TeamOutlined,
  LinkOutlined,
  BarChartOutlined,
  AuditOutlined,
  SettingOutlined,
  StarOutlined,
  HistoryOutlined,
  DatabaseOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined
} from '@ant-design/icons';

const { Sider } = Layout;
const { SubMenu } = Menu;
const { Text } = Typography;

const Sidebar = ({
  collapsed,
  setCollapsed,
  activeTab,
  setActiveTab,
  menuItems,
  user,
  handleCreateDocument,
  showJoinDocModal
}) => {
  // Function to render menu items
  const renderMenuItems = (items) => {
    return items.map(item => {
      // Check if user has permission to see this item
      if (
        (item.adminOnly && user?.role !== 'admin') ||
        (item.authorOnly && user?.role !== 'author') ||
        (item.pmOnly && user?.role !== 'project_manager') ||
        (item.excludeMember && user?.role === 'member') ||
        (item.adminAuthorOnly && !['author', 'admin'].includes(user?.role)) ||
        (item.adminPmOnly && !['project_manager', 'admin'].includes(user?.role))
      ) {
        return null;
      }
      // If the item has children, render as SubMenu
      if (item.children) {
        return (
          <SubMenu 
            key={item.key} 
            icon={item.icon} 
            title={item.label}
          >
            {item.children.map(child => (
              <Menu.Item key={child.key} icon={child.icon} style={child.style} >
                {child.label}
              </Menu.Item>
            ))}
          </SubMenu>
        );
      } else {
        // Otherwise render as Menu.Item
        return (
          <Menu.Item key={item.key} icon={item.icon}>
            {item.label}
          </Menu.Item>
        );
      }
    });
  };

  // Custom trigger for collapsing sidebar with menu icon
  const CustomTrigger = () => (
    <Button
      type="text"
      icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      onClick={() => setCollapsed(!collapsed)}
      style={{ 
        fontSize: '16px',
        width: '100%',
        height: '48px',
        marginBottom: '16px',
        borderRadius: 0,
        borderBottom: '1px solid #f0f0f0'
      }}
    />
  );

  return (
    <Sider 
      collapsible 
      collapsed={collapsed} 
      onCollapse={setCollapsed}
      width={250}
      theme="light"
      style={{ 
        background: '#fff',
        boxShadow: '2px 0 8px 0 rgba(29,35,41,0.05)'
      }}
      trigger={null} // Hide default trigger
    >
      {/* <div className="logo" style={{ 
        height: '64px', 
        margin: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: collapsed ? '12px' : '18px'
      }}>
        {collapsed ? 'DC' : 'Document Collaborator'}
      </div> */}

      {/* Custom collapse trigger at the top */}
      <CustomTrigger />

      {/* <div style={{ padding: '16px', textAlign: 'center' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateDocument}
            style={{ width: '100%' }}
          >
            {!collapsed && 'New Document'}
          </Button>
          <Button 
            type="default" 
            onClick={showJoinDocModal}
            style={{ width: '100%' }}
          >
            {!collapsed ? 'Join Document' : <FileTextOutlined />}
          </Button>
        </Space>
      </div> */}
      
      <Menu
        mode="inline"
        selectedKeys={[activeTab]}
        onClick={({ key }) => setActiveTab(key)}
        style={{ borderRight: 0 }}
      >
        {renderMenuItems(menuItems)}
      </Menu>

      {!collapsed && (
        <div style={{ padding: '16px' }}>
          <Text strong>Quick Access</Text>
          <Menu mode="inline" style={{ border: 'none' }}>
            <Menu.Item key="favorites" icon={<StarOutlined />}>Favorites</Menu.Item>
            <Menu.Item key="recent" icon={<HistoryOutlined />}>Recently Viewed</Menu.Item>
            <Menu.Item key="depository" icon={<DatabaseOutlined />}>Document Depository</Menu.Item>
          </Menu>
        </div>
      )}
    </Sider>
  );
};

export default Sidebar;