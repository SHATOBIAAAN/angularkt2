import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RecepiesService } from '../../service/recipe/recepies.service';
import { RecepItemResponse } from '../../service/recipe/recipe.item.service';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-recepies-item-page',
  imports: [RouterModule],
  templateUrl: './recepies-item-page.component.html',
})
export class RecepiesItemPageComponent implements OnInit, OnDestroy {
  public recepItem: RecepItemResponse | null = null;
  public isLoading = true;
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    public recepiService: RecepiesService
  ) { }

  ngOnInit(): void {
    // Subscribe to route params to reload recipe when ID changes
    const paramsSub = this.route.params.pipe(
      switchMap(params => {
        this.isLoading = true;
        this.recepItem = null; // Clear previous data to show loading state
        const recipeId = params['id'];
        return this.recepiService.getRecipeById(recipeId);
      })
    ).subscribe({
      next: (data) => {
        // Use requestAnimationFrame for smooth transition
        requestAnimationFrame(() => {
          this.recepItem = data;
          this.isLoading = false;
        });
      },
      error: (error) => {
        console.error('Error loading recipe:', error);
        this.isLoading = false;
        this.router.navigate(['/breakfast/all']);
      }
    });
    
    this.subscriptions.add(paramsSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public goBack(): void {
    this.location.back();
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '1';
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://via.placeholder.com/320x320?text=No+Image';
    img.style.opacity = '1';
  }
}