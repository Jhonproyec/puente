import { Routes, UrlMatcher, UrlSegment } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { permissionGuard } from './core/guards/permission.guard-guard';
import { formBuilderUnsaveGuardTsGuard } from './core/guards/form-builder-unsave.guard.ts-guard';
// import { formFillUnsavedGuarGuard } from './core/guards/form-fill-unsaved-guar-guard';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const formularioMatcher: UrlMatcher = (segments: UrlSegment[]) => {
    if (segments.length === 2 &&
        segments[0].path === 'formulario' &&
        UUID_REGEX.test(segments[1].path)) {
        return {
            consumed: segments,
            posParams: {
                uuid: new UrlSegment(segments[1].path, {})
            }
        };
    }
    return null;
};

// const formularioFillMatcher: UrlMatcher = (segments: UrlSegment[]) => {
//     if (segments.length === 3 &&
//         segments[0].path === 'formulario' &&
//         UUID_REGEX.test(segments[1].path) &&
//         segments[2].path === 'fill') {
//         return {
//             consumed: segments,
//             posParams: {
//                 uuid: new UrlSegment(segments[1].path, {})
//             }
//         };
//     }
//     return null;
// }

// const formularioFillSectionMatcher: UrlMatcher = (segments: UrlSegment[]) => {
//     console.log('section matcher segments:', segments.map(s => s.path));
//     if (segments.length === 4 &&
//         segments[0].path === 'formulario' &&
//         UUID_REGEX.test(segments[1].path) &&
//         segments[2].path === 'fill' &&
//         segments[3].path.length > 0) { // ✅ cualquier string no vacío
//         return {
//             consumed: segments,
//             posParams: {
//                 uuid: new UrlSegment(segments[1].path, {}),
//                 sectionId: new UrlSegment(segments[3].path, {})
//             }
//         };
//     }
//     return null;
// };
const formularioBuildMatcher: UrlMatcher = (segments: UrlSegment[]) => {
    console.log('segments:', segments.map(s => s.path));
    if (segments.length === 3 &&
        segments[0].path === 'formulario' &&
        UUID_REGEX.test(segments[1].path) &&
        segments[2].path === 'form-build') {
        return {
            consumed: segments,
            posParams: {
                uuid: new UrlSegment(segments[1].path, {})
            }
        };
    }
    return null;
};

const formularioPreviewMatcher: UrlMatcher = (segments: UrlSegment[]) => {
    if (segments.length === 3 &&
        segments[0].path === 'formulario' &&
        UUID_REGEX.test(segments[1].path) &&
        segments[2].path === 'preview') {
        return {
            consumed: segments,
            posParams: {
                uuid: new UrlSegment(segments[1].path, {})
            }
        };
    }
    return null;
};
export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.Login)

    },
    {
        matcher: formularioPreviewMatcher,
        loadComponent: () => import('./features/form-info/components/form-preview/form-preview').then(m => m.FormPreview)
    },
    {
        path: '',
        canActivate: [authGuard],  // protege todas las rutas hijas
        loadComponent: () => import('./layout/main-layout/main-layout').then(m => m.MainLayout),
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
            },
            {
                path: 'catalogos',
                canActivate: [permissionGuard(['CREATE_CATALOG'])],
                loadComponent: () => import('./features/catalog-management/catalog-management').then(m => m.CatalogManagement),
            },
            {
                path: 'centro-nutreme',
                canActivate: [permissionGuard(['CREATE_CATALOG'])],
                loadComponent: () => import('./features/centro-nutreme/centros-nutreme').then(m =>m.CentrosNutreme),
            },
            {
                path: 'images',
                canActivate: [permissionGuard(['CREATE_CATALOG'])],
                loadComponent: () => import('./features/image-catalog/image-catalog').then(m => m.ImageCatalog),
            },
            {
                path: 'roles',
                canActivate: [permissionGuard(['CREATE_ROLE'])],
                loadComponent: () => import('./features/usuarios/roles/roles').then(m => m.Roles),
            },
            {
                path: 'usuarios',
                canActivate: [permissionGuard(['CREATE_USER'])],
                loadComponent: () => import('./features/usuarios/usuarios').then(m => m.Usuarios),
            },
            {
                matcher: formularioMatcher,
                // canActivate: [permissionGuard(['VIEW_FORM'])],
                loadComponent: () => import('./features/form-info/form-info').then(m => m.FormInfo),
            },
            {
                matcher: formularioBuildMatcher,
                // canActivate: [permissionGuard(['CREATE_FORM', 'UPDATE_FORM'])],
                loadComponent: () => import('./features/form-builder/form-builder').then(m => m.FormBuilder),
                canDeactivate: [formBuilderUnsaveGuardTsGuard]
            },
            // {
            //     matcher: formularioFillMatcher, 
            //     loadComponent: () => import('./features/form-fill/form-fill-index/form-fill-index').then(m => m.FormFillIndex),
            //     canDeactivate: [formFillUnsavedGuarGuard]
            // },
            // {
            //     matcher: formularioFillSectionMatcher,
            //     loadComponent: () => import('./features/form-fill/form-fill-section/form-fill-section').then(m => m.FormFillSection)
            // }
        ]
    },

    { path: '**', redirectTo: '/dashboard' }
];