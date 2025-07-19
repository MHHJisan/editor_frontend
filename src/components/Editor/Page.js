import React from "react";
import "./Page.css";

const Page = React.forwardRef(({ children, pageNumber }, ref) => (
  <div className="a4-page" ref={ref}>
    <div className="page-number">Page {pageNumber}</div>
    {children}
  </div>
));

export default Page;
