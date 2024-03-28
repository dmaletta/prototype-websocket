import {createBrowserRouter, Link} from "react-router-dom";
import {SlateApp} from "./packages/slate-app-client";
import {TodoApp} from "./packages/todo-app-client";
import {ReactNode} from "react";
import {Container, Nav, Navbar} from "react-bootstrap";

const Layout = ({children}: { children: ReactNode }) => {
    return (
        <>
            <Navbar expand="lg" className="bg-body-tertiary mb-3">
                <Container>
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Link to="/slate" className="nav-link">Slate App</Link>
                            <Link to="/todo" className="nav-link">Todo App</Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container>
                {children}
            </Container>
        </>
    )
};

const Router = createBrowserRouter([
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

export default Router;