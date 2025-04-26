import AdminPage from "@/pages/AdminPage";
import Login from "@/pages/Login";
import { createBrowserRouter } from "react-router-dom";
import  RequireAuth from "../components/RequireAuth";

const router = createBrowserRouter(
    [
        {
            path: "/",
            element: <Login/>,
        },
        {
            path: "/AdminPage",
            element:(
                <RequireAuth>
                    <AdminPage/>
                </RequireAuth>
            ),
        },
    ],
    {
        future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
        },
    }
);

export default router;