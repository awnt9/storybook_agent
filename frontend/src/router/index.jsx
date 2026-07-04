import { createBrowserRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Home from "../pages/Home";
import Login from "../pages/Login";
import MyStories from "../pages/MyStories";
import NewStory from "../pages/NewStory";
import Register from "../pages/register";
import RequireAuth from "./RequireAuth";

const router = createBrowserRouter([
  {
    path: "/",
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "dashboard",
        element: (
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        ),
      },
      {
        path: "nueva-historia",
        element: (
          <RequireAuth>
            <NewStory />
          </RequireAuth>
        ),
      },
      {
        path: "mis-historias",
        element: (
          <RequireAuth>
            <MyStories />
          </RequireAuth>
        ),
      },
    ],
  },
]);

export default router;
