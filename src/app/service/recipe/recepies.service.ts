import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RecepItemResponse } from './recipe.item.service';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecepiesService {
  private baseUrl = 'https://dummyjson.com';
  public standartrecepList: RecepItemResponse[] = [];
  public recepList: RecepItemResponse[] = [];
  private currentPage = 0;
  private pageSize = 30;
  private totalRecipes = 0;
  private isLoading = false;
  public recipesLoaded$ = new BehaviorSubject<boolean>(false);

  public get allRecipesLoaded(): boolean {
    return this._allRecipesLoaded;
  }

  private _allRecipesLoaded = false;

  constructor(private httpClient: HttpClient) {}

  private getRecipesPage(): Observable<{ recipes: RecepItemResponse[], total: number }> {
    if (this._allRecipesLoaded) {
      return new Observable(observer => {
        observer.next({ recipes: [], total: this.totalRecipes });
        observer.complete();
      });
    }

    this.isLoading = true;
    const skip = this.currentPage * this.pageSize;
    
    return this.httpClient.get<{ recipes: RecepItemResponse[], total: number }>(
      `${this.baseUrl}/recipes?limit=${this.pageSize}&skip=${skip}`
    );
  }

  public loadMoreRecipes(): void {
    if (this.isLoading || this._allRecipesLoaded) return;

    this.getRecipesPage().subscribe({
      next: (data) => {
        if (this.totalRecipes === 0) {
          this.totalRecipes = data.total;
        }
        
        this.standartrecepList = [...this.standartrecepList, ...data.recipes];
        this.recepList = this.standartrecepList;
        this.currentPage++;
        
        // Check if all recipes are loaded
        if (this.standartrecepList.length >= this.totalRecipes) {
          this._allRecipesLoaded = true;
        }
        
        this.isLoading = false;
        this.recipesLoaded$.next(true);
      },
      error: (error) => {
        console.error('Error loading recipes:', error);
        this.isLoading = false;
      }
    });
  }

  public initializeRecipes(): void {
    if (this.standartrecepList.length === 0) {
      this.currentPage = 0;
      this._allRecipesLoaded = false;
      this.loadMoreRecipes();
    }
  }

  public getRecipeById(id: number | string): Observable<RecepItemResponse> {
    return this.httpClient.get<RecepItemResponse>(this.baseUrl + `/recipes/${id}`);
  }

  public filterRecipesByDifficulty(difficulty: string): RecepItemResponse[] {
    if (difficulty === 'all') {
      this.recepList = this.standartrecepList;
      return this.recepList; 
    } 
    else if(difficulty === 'easy') {
      this.recepList = this.standartrecepList;
      this.recepList = this.recepList.filter(recipe => recipe.difficulty.toLowerCase() === 'easy');
      return this.recepList;
    } 
    else {
      this.recepList = this.standartrecepList;
      this.recepList = this.recepList.filter(recipe => recipe.difficulty.toLowerCase() === 'medium');
      return this.recepList;
    } 
  }

  public filterRecipesByMealType(mealType: string): RecepItemResponse[] {
    if (mealType === 'breakfast') {
      this.recepList = this.standartrecepList;
      this.recepList = this.recepList.filter(recipe => 
        recipe.mealType.includes('Breakfast'));
      return this.recepList;
    }
    else if (mealType === 'dinner') {
      this.recepList = this.standartrecepList;
      this.recepList = this.recepList.filter(recipe => 
        recipe.mealType.includes('Dinner'));
      return this.recepList;
    }
    else if (mealType === 'lunch') {
      this.recepList = this.standartrecepList;
      this.recepList = this.recepList.filter(recipe => 
        recipe.mealType.includes('Lunch'));
      return this.recepList;
    } else {
      return this.recepList;
    }
  }
}