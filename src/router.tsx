import {createBrowserRouter, Link} from "react-router-dom";
import {lazy, ReactNode, Suspense} from "react";
import {Container, Nav, Navbar} from "react-bootstrap";

const SlateApp = lazy(() =>
    import('./packages/slate-app-client').then(module => ({default: module.SlateApp})));

const TodoApp = lazy(() =>
    import('./packages/todo-app-client').then(module => ({default: module.TodoApp})));

const Layout = ({children}: { children: ReactNode }) => {
    return (
        <>
            <Navbar expand="lg" className="bg-body-tertiary mb-3">
                <Container>
                    <Nav className="me-auto">
                        <Link to="/slate" className="nav-link">Slate App</Link>
                        <Link to="/todo" className="nav-link">Todo App</Link>
                    </Nav>
                </Container>
            </Navbar>
            <Container>
                <Suspense>
                    {children}
                </Suspense>
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