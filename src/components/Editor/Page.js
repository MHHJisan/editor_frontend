import React from "react";
import "./Page.css";

const Page = React.forwardRef(({ children }, ref) => (
  <div className="a4-page" ref={ref}>
    {children}
  </div>
));

export default Page;
