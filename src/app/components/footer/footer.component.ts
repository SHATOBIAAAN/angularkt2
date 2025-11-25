import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RecepiesService } from '../../service/recipe/recepies.service';
import { RouterLink } from '@angular/router';
import { RecepItemResponse } from '../../service/recipe/recipe.item.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.component.html',
})
export class FooterComponent implements OnInit, OnDestroy {
  public recepiServise = inject(RecepiesService);
  public allRecipes: RecepItemResponse[] = [];
  private subscriptions = new Subscription();

  ngOnInit(): void {
    // Initialize recipes if not already loaded
    if (this.recepiServise.standartrecepList.length === 0) {
      this.recepiServise.initializeRecipes();
    }
    
    // Subscribe to recipes loaded to update the list
    const recipesSub = this.recepiServise.recipesLoaded$.subscribe(() => {
      this.updateRecipes();
    });
    this.subscriptions.add(recipesSub);
    
    // Initial load
    this.updateRecipes();
    
    // Also check periodically in case recipes are still loading
    const checkInterval = setInterval(() => {
      if (this.recepiServise.standartrecepList.length > 0 && this.allRecipes.length === 0) {
        this.updateRecipes();
      }
    }, 200);
    
    setTimeout(() => clearInterval(checkInterval), 5000);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target) return;
    
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    // Load more when scrolled to 80% of the container (vertical scroll)
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    if (scrollPercentage >= 0.8) {
      this.recepiServise.loadMoreRecipes();
      setTimeout(() => this.updateRecipes(), 100);
    }
  }

  private updateRecipes(): void {
    // Get all loaded recipes
    this.allRecipes = [...this.recepiServise.standartrecepList];
  }
}