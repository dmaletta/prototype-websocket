import React, {ReactNode} from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {TextElementApp} from "./packages/text-element-client";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import {TodoApp} from "./packages/todo-client";
import {Container, Nav, Navbar} from "react-bootstrap";

const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <Layout>
                <h1>Prototype</h1>
                <p>This application is designed to provide both Todo and Text Element functionality. Users can navigate
                    between different components through the menu. The Todo functionality allows users to manage their
                    daily tasks while the Text Element functionality allows users to manipulate text in various
                    ways.</p>
            </Layout>
        ),
    },
    {
        path: "/text-element",
        element: (
            <Layout><TextElementApp/></Layout>
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
                    <Navbar.Brand href="/">Prototype</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav"/>
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link href="/text-element">Text Element</Nav.Link>
                            <Nav.Link href="/todo">Todo</Nav.Link>
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