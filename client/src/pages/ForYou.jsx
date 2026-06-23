import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AllPosts from "./AllPosts.jsx";

const ForYou = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "for-you") return;

    params.set("mode", "for-you");
    navigate(`${location.pathname}?${params.toString()}`, {
      replace: true,
      state: { preserveScroll: true },
    });
  }, [location.pathname, location.search, navigate]);

  return <AllPosts />;
};

export default ForYou;
