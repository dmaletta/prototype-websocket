import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {RouterProvider} from "react-router-dom";
import router from "./router.tsx";

const match = window.matchMedia('(prefers-color-scheme: dark)');
const setTheme = (dark: boolean) => {
    window.document.body.setAttribute('data-bs-theme', dark ? 'dark' : 'white');
}
setTheme(match.matches);
match.addEventListener('change', event => {
    setTheme(event.matches);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <RouterProvider router={router}/>
    </React.StrictMode>,
)