import { Routes } from '@angular/router';
import { RecepiesListPageComponent } from './pages/recepies-list-page/recepies-list-page.component';
import { RecepiesItemPageComponent } from './pages/recepies-item-page/recepies-item-page.component';
import { NotFoundPageComponent } from './pages/not-found-page/not-found-page.component';

export const routes: Routes = [
    { redirectTo: 'breakfast/all', path: '', pathMatch: 'full' },
    { component: RecepiesListPageComponent, path: 'breakfast/:difficulty' },
    { component: RecepiesListPageComponent, path: 'lunch/:difficulty' },
    { component: RecepiesListPageComponent, path: 'dinner/:difficulty' },
    { component: RecepiesItemPageComponent, path: 'recipe/:id' },
    { component: NotFoundPageComponent, path: '**' },
];