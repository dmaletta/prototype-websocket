import React, {ReactNode} from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {SlateApp} from "./packages/slate-app-client";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import {TodoApp} from "./packages/todo-app-client";
import {Container, Nav, Navbar} from "react-bootstrap";

const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <Layout>
                <h1>Prototype</h1>
                <p>...</p>
            </Layout>
        ),
    },
    {
        path: "/slate",
        element: (
            <Layout><SlateApp/></Layout>
        ),
    },
    {
        path: "/todo",
        element: (
            <Layout><TodoApp/></Layout>
        ),
    },
]);


function Layout({children}: { children: ReactNode }) {
    return (
        <>
            <Navbar expand="lg" className="bg-body-tertiary mb-3">
                <Container>
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link href="/slate">Slate App</Nav.Link>
                            <Nav.Link href="/todo">Todo App</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container>
                {children}
            </Container>
        </>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <RouterProvider router={router}/>
    </React.StrictMode>,
)