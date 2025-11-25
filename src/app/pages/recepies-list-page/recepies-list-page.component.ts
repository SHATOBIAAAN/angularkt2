import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecepiesService } from '../../service/recipe/recepies.service';
import { RecepItemResponse } from '../../service/recipe/recipe.item.service';
import { Subscription } from 'rxjs';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-recepies-list-page',
  imports: [RouterLink, NgClass],
  templateUrl: './recepies-list-page.component.html',
})
export class RecepiesListPageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef<HTMLElement>;
  
  public recepiServise = inject(RecepiesService);
  public recepItem: RecepItemResponse[] = []; 
  public currentDifficulty: string = 'all'; 
  public currentMealType: string = 'breakfast';
  private subscriptions = new Subscription();
  private isLoadingMore = false;
  private scrollHandler?: () => void;
  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;
  private animationFrameId?: number;
  private frameCount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public recepiService: RecepiesService
  ) {}

  ngOnInit(): void {
    // Initialize recipes with pagination
    this.recepiServise.initializeRecipes();
    
    // Subscribe to recipes loaded
    const recipesSub = this.recepiServise.recipesLoaded$.subscribe(() => {
      this.applyFilters();
    });
    this.subscriptions.add(recipesSub);
    
    // Get mealType from URL path and difficulty from params
    const urlSub = this.route.url.subscribe(urlSegments => {
      if (urlSegments.length > 0) {
        const mealTypeFromUrl = urlSegments[0].path;
        if (['breakfast', 'lunch', 'dinner'].includes(mealTypeFromUrl)) {
          this.currentMealType = mealTypeFromUrl;
          this.applyFilters();
        }
      } else {
        // Handle root path - default to breakfast
        this.currentMealType = 'breakfast';
        this.applyFilters();
      }
    });
    this.subscriptions.add(urlSub);
    
    const paramsSub = this.route.params.subscribe(params => {
      this.currentDifficulty = params['difficulty'] || 'all';
      this.applyFilters();
    });
    this.subscriptions.add(paramsSub);
  }

  ngAfterViewInit(): void {
    // Setup scroll listener after view is initialized
    setTimeout(() => {
      this.setupScrollListener();
      this.setupMouseListeners();
    }, 100);
  }

  private setupMouseListeners(): void {
    if (!this.scrollContainer?.nativeElement) return;
    const container = this.scrollContainer.nativeElement;
    container.addEventListener('mousedown', this.onMouseDownHandler);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.scrollHandler && this.scrollContainer?.nativeElement) {
      this.scrollContainer.nativeElement.removeEventListener('scroll', this.scrollHandler);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    // Remove mouse event listeners
    this.removeMouseListeners();
  }

  private removeMouseListeners(): void {
    if (!this.scrollContainer?.nativeElement) return;
    const container = this.scrollContainer.nativeElement;
    container.removeEventListener('mousedown', this.onMouseDownHandler);
    document.removeEventListener('mousemove', this.onMouseMoveHandler);
    document.removeEventListener('mouseup', this.onMouseUpHandler);
  }

  private onMouseDownHandler = (e: MouseEvent) => this.onMouseDown(e);
  private onMouseMoveHandler = (e: MouseEvent) => this.onMouseMove(e);
  private onMouseUpHandler = () => this.onMouseUp();

  private setupScrollListener(): void {
    if (!this.scrollContainer?.nativeElement) return;

    const container = this.scrollContainer.nativeElement;
    let ticking = false;

    // Throttled scroll handler using requestAnimationFrame for smooth performance
    this.scrollHandler = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.checkScrollPosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  private checkScrollPosition(): void {
    const container = this.scrollContainer?.nativeElement;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    // Calculate how close we are to the end (in pixels)
    const distanceFromEnd = scrollWidth - (scrollLeft + clientWidth);
    
    // Load more when within 1500px of the end for seamless loading
    // This ensures content is loaded before user reaches the end
    if (distanceFromEnd < 1500 && !this.isLoadingMore && !this.recepiServise.allRecipesLoaded) {
      this.loadMoreRecipes();
    }
  }

  private loadMoreRecipes(): void {
    if (this.isLoadingMore) return;
    
    this.isLoadingMore = true;
    this.recepiServise.loadMoreRecipes();
    
    // Wait for recipes to load, then update filters seamlessly
    const checkSub = this.recepiServise.recipesLoaded$.subscribe(() => {
      // Use requestAnimationFrame for seamless UI update
      requestAnimationFrame(() => {
        this.applyFilters();
        // Reset loading flag after a short delay to allow smooth scrolling
        requestAnimationFrame(() => {
          this.isLoadingMore = false;
          checkSub.unsubscribe();
        });
      });
    });
  }

  applyFilters(): void {
    // Use requestAnimationFrame to prevent layout shifts
    requestAnimationFrame(() => {
      // Get all recipes first
      let filtered = [...this.recepiServise.standartrecepList];
      
      // Apply difficulty filter
      if (this.currentDifficulty !== 'all') {
        filtered = filtered.filter(recipe => 
          recipe.difficulty.toLowerCase() === this.currentDifficulty.toLowerCase()
        );
      }
      
      // Apply meal type filter
      if (this.currentMealType === 'breakfast') {
        filtered = filtered.filter(recipe => recipe.mealType.includes('Breakfast'));
      } else if (this.currentMealType === 'lunch') {
        filtered = filtered.filter(recipe => recipe.mealType.includes('Lunch'));
      } else if (this.currentMealType === 'dinner') {
        filtered = filtered.filter(recipe => recipe.mealType.includes('Dinner'));
      }
      
      this.recepItem = filtered;
    });
  }

  onDifficultyChange(difficulty: string): void {
    this.currentDifficulty = difficulty;
    this.router.navigate(['/', this.currentMealType, difficulty]);
    // Filters will be applied automatically via route params subscription
  }

  onMealTypeChange(mealType: string): void {
    this.currentMealType = mealType;
    this.router.navigate(['/', mealType, this.currentDifficulty]);
    // Filters will be applied automatically via route params subscription
  }

  // Momentum properties
  private velocity = 0;
  private lastX = 0;
  private lastTime = 0;
  private momentumID?: number;

  onMouseDown(e: MouseEvent): void {
    if (!this.scrollContainer?.nativeElement) return;
    const container = this.scrollContainer.nativeElement;
    
    // Stop any active momentum
    if (this.momentumID) {
      cancelAnimationFrame(this.momentumID);
      this.momentumID = undefined;
    }

    this.isDragging = true;
    
    // Disable smooth scroll for instant drag response
    container.style.scrollBehavior = 'auto';
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
    
    this.startX = e.pageX - container.offsetLeft;
    this.scrollLeft = container.scrollLeft;
    
    // Initialize momentum tracking
    this.lastX = e.pageX;
    this.lastTime = Date.now();
    this.velocity = 0;
    
    // Add global listeners for smooth dragging
    document.addEventListener('mousemove', this.onMouseMoveHandler);
    document.addEventListener('mouseup', this.onMouseUpHandler);
    
    e.preventDefault();
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.scrollContainer?.nativeElement) return;
    
    const container = this.scrollContainer.nativeElement;
    e.preventDefault();
    
    const now = Date.now();
    const currentX = e.pageX;
    const dt = now - this.lastTime;

    // Calculate velocity (pixels per ms)
    if (dt > 0) {
      this.velocity = (currentX - this.lastX) / dt;
    }
    
    this.lastX = currentX;
    this.lastTime = now;

    // Use requestAnimationFrame for smooth scrolling
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.animationFrameId = requestAnimationFrame(() => {
      const x = e.pageX - container.offsetLeft;
      const walk = (x - this.startX) * 1.5; 
      container.scrollLeft = this.scrollLeft - walk;
      
      this.frameCount++;
      if (this.frameCount % 5 === 0) {
        this.checkScrollPosition();
      }
    });
  }

  onMouseUp(): void {
    if (!this.scrollContainer?.nativeElement) return;
    
    this.isDragging = false;
    const container = this.scrollContainer.nativeElement;
    
    container.style.cursor = 'grab';
    container.style.userSelect = '';
    
    // Remove global listeners
    document.removeEventListener('mousemove', this.onMouseMoveHandler);
    document.removeEventListener('mouseup', this.onMouseUpHandler);
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    // Start momentum
    this.beginMomentum();
  }

  private beginMomentum(): void {
    if (!this.scrollContainer?.nativeElement) return;
    const container = this.scrollContainer.nativeElement;
    
    // Momentum loop
    const step = () => {
      if (Math.abs(this.velocity) < 0.1) {
        // Stop momentum and re-enable snap
        this.stopMomentum();
        return;
      }

      // Apply velocity
      container.scrollLeft -= this.velocity * 16; // approx 16ms per frame
      
      // Decay velocity (friction)
      this.velocity *= 0.95;

      // Check pagination during momentum
      this.frameCount++;
      if (this.frameCount % 10 === 0) {
        this.checkScrollPosition();
      }

      this.momentumID = requestAnimationFrame(step);
    };

    this.momentumID = requestAnimationFrame(step);
  }

  private stopMomentum(): void {
    if (this.momentumID) {
      cancelAnimationFrame(this.momentumID);
      this.momentumID = undefined;
    }
    
    if (this.scrollContainer?.nativeElement) {
      const container = this.scrollContainer.nativeElement;
      // Smoothly transition back to smooth scroll
      container.style.scrollBehavior = 'smooth';
    }
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'https://via.placeholder.com/320x320?text=No+Image';
    }
  }
}


