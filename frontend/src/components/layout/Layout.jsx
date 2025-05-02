import React from "react";
import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="App">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
