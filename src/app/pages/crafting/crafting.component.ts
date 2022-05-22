import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { debounceTime, filter, first, iif, map, Observable, shareReplay, startWith, Subscription, take } from 'rxjs';
import slugify from 'slugify';
import { Filter } from 'src/interfaces/common';
import { ApiService, MarketLiveItem } from 'src/services/api';
import { CommonService } from 'src/services/common';
import { regionMap } from 'src/services/common';

import craftingdata from '../../../data/craftingdata.json';

const categoriesMap: { [slug: string]: { category: string, subcategories: { [subslug: string]: string } } } = {
  "favorites": {
    category: "Favorites",
    subcategories: {
      "all": "All"
    }
  },
  "recommendations": {
    category: "Recommendations",
    subcategories: {
      "all": "All"
    }
  },
  'battle-item': {
    category: 'Battle Item',
    subcategories: {
      'potion': 'Battle Item - Potion',
      'bomb': 'Battle Item - Bomb',
      'grenade': 'Battle Item - Grenade',
      'robe': 'Battle Item - Robe',
      'others': 'Battle Item - Others',
    }
  },
  'cooking': {
    category: "Cooking",
    subcategories: {
      'artisan': "Artisan Cooking",
      'artificer': "Artificer Cooking",
      "expert": "Expert Cooking"
    }
  },
  "structure": {
    category: "Structure",
    subcategories: {
      "building": "Landmark - Building",
      "garden": "Landmark - Garden",
      "wall": "Landmark - Wall",
      "others": "Landmark - Others",
      "bed": "Furniture - Bed",
      "chair": "Furniture - Chair",
      "table": "Furniture - Table",
      "cabinet": "Furniture - Cabinet",
      "tool": "Prop - Tool",
      "decoration": "Prop - Decoration"
    }
  },
  "tools": {
    category: "Tools",
    subcategories: {
      "foraging": "Foraging Tool",
      "logging": "Logging Tool",
      "mining": "Mining Tool",
      "hunting": "Hunting Tool",
      "fishing": "Fishing Tool",
      "excavating": "Excavating Tool",
      "part-materials": "Part Materials"
    }
  },
  "special": {
    category: "Special",
    subcategories: {
      "fusion-material": "Fusion Material",
      "skill-tree-extract": "Skill Tree Extract",
      "secret-map": "Secret Map"
    }
  },
  "farm": {
    category: "Farm",
    subcategories: {
      "battle-item": "Battle Item",
      "cooking": "Cooking",
      "fusion-material": "Fusion Material",
      "trade-skill-tools": "Trade Skill Tools",
      "treasure-map": "Treasure Map",
      "ship-parts": "Ship Parts"
    }
  }
}

export interface Material {
  amount: number;
  id: string;
  image: string;
  name: string;
  rarity: number;
}

export interface Recipe {
  name: string;
  id: string;
  image: string;
  rarity: number;
  amount: number;
  category: string;
  subcategory: string;
  cost: number;
  energy: number;
  energyDiscounted?: number;
  craftingTime: string;
  strongholdXp: number;
  strongholdXpIncreased?: number;
  price?: number;
  total?: number;
  costDiscounted?: number;
  craftTotal?: number;
  partialCraftTotal?: number;
  craftvsbuy?: number;
  fullCraftvsbuy?: number;
  partialCraftvsbuy?: number;
  open?: boolean;
  recomendation?: string;
  craftingTimeSeconds?: number;
  craftingTimeSecondsDiscounted?: number;
  requirements: {
    href?: string;
    start?: string;
    text: string;
    end?: string;
  }[];
  ingredients: Partial<Recipe>[]
}

export interface CraftingSubMenu {
  id: string;
  name: string;
  items: Recipe[]
};


@Component({
  selector: 'app-crafting',
  templateUrl: './crafting.component.html',
  styleUrls: ['./crafting.component.css']
})
export class CraftingComponent implements OnInit, OnDestroy {
  bonusForm = new FormGroup({
    costReduction: new FormControl(0, [Validators.min(-30), Validators.max(0)]),
    energyReduction: new FormControl(0, [Validators.min(-30), Validators.max(0)]),
    craftingTimeReduction: new FormControl(0, [Validators.min(-30), Validators.max(0)]),
    strongholdXpIncrease: new FormControl(0, [Validators.min(0), Validators.max(30)]),
    showStrongholdXp: new FormControl(true),
    showEnergy: new FormControl(true),
  });
  searchControl = new FormControl();
  options: string[] = [];
  filteredOptions?: Observable<string[]>;
  filter: Filter;
  menu: { id: string; name: string }[] = [];
  submenu: CraftingSubMenu[] = [];
  routeSubscription: Subscription;
  regionSubscription: Subscription;
  bonusesSubscription: Subscription;
  recipes: { [itemId: string]: Recipe } = {};
  favorites: string[] = [];
  recommendations: { [itemId: string]: Recipe } = {};
  recipeMenu: { [id: string]: { open: boolean } } = {};
  marketData: { [itemId: string]: MarketLiveItem } = {};
  selectedRecipeId?: string;
  category: string = 'favorites';


  isLarge$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.Large, Breakpoints.XLarge])
    .pipe(
      map(result => !result.matches),
      shareReplay()
    );

  isMedium$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.Large, Breakpoints.XLarge, Breakpoints.Medium])
    .pipe(
      map(result => !result.matches),
      shareReplay()
    );

  constructor(
    private breakpointObserver: BreakpointObserver,
    public common: CommonService,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.favorites = JSON.parse(localStorage.getItem('craftFavorites') || "[]");
    this.options = Object.values(craftingdata).map(r => r.name);
    this.filteredOptions = this.searchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value)),
    );
    this.filter = {
      favorites: true
    };
    this.menu = this.buildMenu();
    this.buildRecipes();

    this.routeSubscription = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => route),
      map(route => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      })).subscribe(route => {
        const { category, subcategory, item } = route.snapshot.params;
        const { search } = route.snapshot.queryParams;
        const previousCategory = `${this.filter.category}`;
        if (search) {
          this.searchControl.setValue(search);
          this.filter.category = 'search';
          this.filter.subcategory = 'all';
          this.filter.favorites = false;
          this.filter.search = search;
          this.buildSubMenu('search');
          if (item) {
            this.selectedRecipeId = item;
          } else {
            this.router.navigate([this.common.regionSlug, 'crafting', 'search', 'all', this.submenu[0].items[0].id], { queryParamsHandling: 'preserve' });
            this.selectedRecipeId = this.submenu[0].items[0].id;
          }
          return;
        }
        if (category) {
          this.category = categoriesMap[category].category;
          this.selectedRecipeId = undefined;
          this.filter.category = category;
          if (category == 'favorites') {
            this.filter.favorites = true;
            this.filter.subcategory = undefined;
            this.buildSubMenu(category);
          } else if (category == 'recommendations') {
            this.filter.favorites = false;
            this.filter.subcategory = undefined;
            if (previousCategory != category) {
              this.buildSubMenu(category);
            }
          } else {
            this.filter.favorites = false;
            if (previousCategory != category) {
              this.buildSubMenu(category);
            }
            if (subcategory) {
              this.filter.subcategory = subcategory
            } else {
              this.filter.subcategory = undefined;
            }
          }
          if (item) {
            this.selectedRecipeId = item;
          } else {
            if (this.submenu[0].items[0]) {
              this.router.navigate([this.common.regionSlug, 'crafting', this.filter.category, this.filter.subcategory || this.submenu[0].id, (this.submenu.find(sm => sm.id == this.filter.subcategory) || this.submenu[0]).items[0].id], { queryParamsHandling: 'preserve' });
              this.selectedRecipeId = this.submenu[0].items[0]?.id;
            }
          }
        } else {
          this.filter.favorites = true;
          this.filter.category = undefined;
          this.filter.subcategory = undefined;
          this.router.navigate([this.common.regionSlug, 'crafting', 'recommendations']);
        }
      });
    this.regionSubscription = this.common.region$.pipe(startWith(this.common.region)).subscribe(region => {
      this.api.getLiveData().pipe(take(1)).subscribe((data) => {
        this.marketData = data.reduce<{ [itemId: string]: MarketLiveItem }>((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {});
        this.setRecipePrices();
      });
    })

    const craftingStrongholdBonuses = JSON.parse(localStorage.getItem('craftingStrongholdBonuses') || 'null');
    if (craftingStrongholdBonuses) {
      this.bonusForm.setValue(craftingStrongholdBonuses);
    }
    this.bonusesSubscription = this.bonusForm.valueChanges.pipe(debounceTime(100), startWith(this.bonusForm.value)).subscribe(bonuses => {
      localStorage.setItem('craftingStrongholdBonuses', JSON.stringify(bonuses));
      this.updateDiscounts();
    })
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.regionSubscription) {
      this.regionSubscription.unsubscribe();
    }
    if (this.bonusesSubscription) {
      this.bonusesSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {
  }

  search() {
    const search = this.searchControl.value;
    this.router.navigate([this.common.regionSlug, 'crafting'], {
      queryParams: {
        search
      }
    });
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    if (!value || value.length < 3) {
      return [];
    }
    return this.options.filter(option => option.toLowerCase().includes(filterValue));
  }

  buildMenu() {
    return Object.keys(categoriesMap).map(id => ({ id, name: categoriesMap[id].category }));
  }

  buildSubMenu(categoryId: string) {
    if (categoryId == 'favorites') {
      this.submenu = [{
        id: 'all',
        name: "All",
        items: craftingdata.filter(cd => this.favorites.indexOf(cd.id) >= 0).sort((a, b) => a.name > b.name ? 1 : -1)
      }];
    } else if (categoryId == 'recommendations') {
      this.submenu = [{
        id: 'all',
        name: "All",
        items: Object.values(this.recommendations)
      }];
    } else if (categoryId == 'search') {
      this.submenu = [{
        id: 'all',
        name: "All",
        items: craftingdata.filter(cd => cd.name.toLowerCase().indexOf(this.filter.search!.toLowerCase()) >= 0).sort((a, b) => a.name > b.name ? 1 : -1)
      }];
      console.log('this.filter.search!.toLowerCase()', this.filter.search!.toLowerCase());
      console.log('submenu', this.submenu);
    } else {
      this.submenu = Object.keys(categoriesMap[categoryId].subcategories).map(id => ({
        id,
        name: categoriesMap[categoryId].subcategories[id],
        items: craftingdata.filter(cd => cd.subcategory == categoriesMap[categoryId].subcategories[id] && cd.category == categoriesMap[categoryId].category).sort((a, b) => a.name > b.name ? 1 : -1)
      }));
    }
  }

  toggleCraft(ingredientIndex: number) {
    if (this.recipes[this.selectedRecipeId!]!.ingredients[ingredientIndex]) {
      this.recipes[this.selectedRecipeId!]!.ingredients[ingredientIndex].open = !this.recipes[this.selectedRecipeId!]!.ingredients[ingredientIndex].open;
      this.recipes[this.selectedRecipeId!]!.open = this.recipes[this.selectedRecipeId!]!.ingredients[ingredientIndex].open
      if (this.recipes[this.selectedRecipeId!]!.ingredients[ingredientIndex].open) {
        this.recipes[this.selectedRecipeId!]!.total = this.recipes[this.selectedRecipeId!]!.craftTotal;
      } else {
        this.recipes[this.selectedRecipeId!]!.total = this.recipes[this.selectedRecipeId!]!.partialCraftTotal;
      }
      this.recipes[this.selectedRecipeId!]!.craftvsbuy = Math.round((-1 + (this.recipes[this.selectedRecipeId!]!.total! / this.recipes[this.selectedRecipeId!]!.price!)) * 10000) / 100;
    }
  }

  buildRecipes() {
    this.recipes = craftingdata.reduce<{ [itemId: string]: Recipe }>((acc, cd) => {
      acc[cd.id] = {
        ...cd,
        open: false,
        craftingTimeSeconds: function () {
          const timeMatch = cd.craftingTime.match(/((\d{1,2})h)?[ ]?((\d{1,2})m)?/);
          return parseInt(timeMatch![2] || '0') * 3600 + parseInt(timeMatch![4] || '0') * 60;
        }(),
        ingredients: cd.ingredients.map(ingredient => {
          const subRecipe = craftingdata.find(cd => cd.id == ingredient.id);
          if (subRecipe) {
            return {
              name: ingredient.name,
              id: ingredient.id,
              image: ingredient.image,
              rarity: ingredient.rarity,
              amount: ingredient.amount,
              open: false,
              ingredients: subRecipe.ingredients.map(item => ({
                name: item.name,
                id: item.id,
                image: item.image,
                rarity: item.rarity,
                open: false,
                amount: Math.round(item.amount / subRecipe.amount * ingredient.amount),
              })),
              craftingTimeSeconds: function () {
                const timeMatch = subRecipe.craftingTime.match(/((\d{1,2})h)?[ ]?((\d{1,2})m)?/);
                return parseInt(timeMatch![2] || '0') * 3600 + parseInt(timeMatch![4] || '0') * 60;
              }(),
              energy: Math.round(ingredient.amount / subRecipe.amount * subRecipe.energy),
              cost: Math.round(ingredient.amount / subRecipe.amount * subRecipe.cost),
              strongholdXp: Math.round(ingredient.amount / subRecipe.amount * subRecipe.strongholdXp),
            };
          }
          return { ...ingredient, open: false, craftingTimeSeconds: 0 };
        })
      };
      return acc;
    }, {});
  }

  setRecipePrices() {
    for (const recipeId in this.recipes) {
      const itemId = slugify(this.recipes[recipeId].name, { lower: true, remove: /[\[\]]/g })
        .toLowerCase()
        .replace(/[ ']/g, "-")
        .replace(/\:/g, "")
        .replace(/!/g, "") + '-' + this.recipes[recipeId].rarity;
      if (this.marketData[itemId]?.lowPrice) {
        this.recipes[recipeId].price = Math.max(Math.round(
          this.marketData[itemId]?.lowPrice /
          this.marketData[itemId]?.amount *
          this.recipes[recipeId].amount
        ), 1);
      } else {
        this.recipes[recipeId].price = 0;
      }
      for (const ingredientIndexStr in this.recipes[recipeId].ingredients) {
        const ingredientIndex = parseInt(ingredientIndexStr);
        const ingredientId = this.recipes[recipeId].ingredients[ingredientIndex].id!;
        if (this.marketData[ingredientId]?.lowPrice) {
          this.recipes[recipeId].ingredients[ingredientIndex].price = Math.round(
            this.marketData[ingredientId]?.lowPrice /
            this.marketData[ingredientId]?.amount *
            this.recipes[recipeId].ingredients[ingredientIndex].amount!
          ) || 1;

        } else {
          this.recipes[recipeId].ingredients[ingredientIndex].price = 0;

        }
        if (this.recipes[recipeId].ingredients[ingredientIndex].ingredients) {
          // Add prices
          for (const subIngredientIndexStr in this.recipes[recipeId].ingredients[ingredientIndex].ingredients) {
            const subIngredientIndex = parseInt(subIngredientIndexStr);
            const subIngredientId = this.recipes[recipeId].ingredients[ingredientIndex].ingredients![subIngredientIndex].id!;

            this.recipes[recipeId].ingredients[ingredientIndex].ingredients![subIngredientIndex].price = Math.round(
              this.marketData[subIngredientId]?.lowPrice /
              this.marketData[subIngredientId]?.amount *
              this.recipes[recipeId].ingredients[ingredientIndex].ingredients![subIngredientIndex].amount!
            );
          }
        }
      }

      this.updateDiscount(recipeId);

      // Set default total
      if (this.recipes[recipeId].recomendation == 'Craft') {
        this.recipes[recipeId].total = this.recipes[recipeId].craftTotal;
        this.recipes[recipeId].craftvsbuy = this.recipes[recipeId].fullCraftvsbuy;
        this.recipes[recipeId].ingredients = this.recipes[recipeId].ingredients.map(i => ({ ...i, open: true }));
        this.recipes[recipeId].open = true;
      } else {
        this.recipes[recipeId].total = this.recipes[recipeId].partialCraftTotal;
        this.recipes[recipeId].craftvsbuy = this.recipes[recipeId].partialCraftvsbuy;
      }

      if (Math.min((this.recipes[recipeId].craftvsbuy || 0), (this.recipes[recipeId].fullCraftvsbuy || 0)) < -30) {
        this.recommendations[recipeId] = this.recipes[recipeId];
      }
    }
    if (this.filter.category == 'recommendations') {
      this.buildSubMenu('recommendations');
      if (this.selectedRecipeId) {
        console.log(this.selectedRecipeId);
        if (this.recipes[this.selectedRecipeId].craftvsbuy! > -20) {
          this.selectedRecipeId = undefined;
          this.router.navigate([this.common.regionSlug, 'crafting', 'recommendations', 'all', this.submenu[0].items[0].id], { queryParamsHandling: 'preserve' });
          this.selectedRecipeId = this.submenu[0].items[0].id;
        }
      } else {
        this.router.navigate([this.common.regionSlug, 'crafting', 'recommendations', 'all', this.submenu[0].items[0].id], { queryParamsHandling: 'preserve' });
        this.selectedRecipeId = this.submenu[0].items[0].id;
      }
    }
    if (this.filter.search || this.filter.category == 'favorites') {
      this.buildSubMenu(this.filter.category!);
      if (!this.selectedRecipeId) {
        if (this.submenu[0].items[0]) {
          this.selectedRecipeId = this.submenu[0].items[0].id;
        }
      }
    }
  }

  updateDiscounts() {
    this.recommendations = {};
    for (const recipeIndex in this.recipes) {
      this.updateDiscount(recipeIndex);
      if (Math.min((this.recipes[recipeIndex].craftvsbuy || 0), (this.recipes[recipeIndex].fullCraftvsbuy || 0)) < -30) {
        this.recommendations[recipeIndex] = this.recipes[recipeIndex];
      }
    }
    if (this.filter.category == 'recommendations') {
      this.buildSubMenu('recommendations');
      if (this.selectedRecipeId) {
        if (this.recipes[this.selectedRecipeId].craftvsbuy! > -20) {
          this.selectedRecipeId = undefined;
          this.router.navigate([this.common.regionSlug, 'crafting', 'recommendations', 'all', this.submenu[0].items[0].id], { queryParamsHandling: 'preserve' });
          this.selectedRecipeId = this.submenu[0].items[0].id;
        }
      }
    }

  }

  updateDiscount(recipeIndex: string) {
    const bonuses = this.bonusForm.value;
    this.recipes[recipeIndex].craftingTimeSecondsDiscounted = Math.round(this.recipes[recipeIndex].craftingTimeSeconds! * (1 + (bonuses.craftingTimeReduction / 100)));
    this.recipes[recipeIndex].energyDiscounted = Math.round(this.recipes[recipeIndex].energy! * (1 + (bonuses.energyReduction / 100)));
    this.recipes[recipeIndex].costDiscounted = Math.round(this.recipes[recipeIndex].cost! * (1 + (bonuses.costReduction / 100)));
    this.recipes[recipeIndex].strongholdXpIncreased = Math.round(this.recipes[recipeIndex].strongholdXp! * (1 + (bonuses.strongholdXpIncrease / 100)));
    this.recipes[recipeIndex].craftingTimeSecondsDiscounted = Math.round(this.recipes[recipeIndex].craftingTimeSeconds! * (1 + (bonuses.craftingTimeReduction / 100)));
    for (let ingredientIndex in this.recipes[recipeIndex].ingredients) {
      this.recipes[recipeIndex].ingredients[ingredientIndex].craftingTimeSecondsDiscounted = Math.round(this.recipes[recipeIndex].ingredients[ingredientIndex].craftingTimeSeconds! * (1 + (bonuses.craftingTimeReduction / 100)));
      this.recipes[recipeIndex].ingredients[ingredientIndex].energyDiscounted = Math.round(this.recipes[recipeIndex].ingredients[ingredientIndex].energy! * (1 + (bonuses.energyReduction / 100)));
      this.recipes[recipeIndex].ingredients[ingredientIndex].costDiscounted = Math.round(this.recipes[recipeIndex].ingredients[ingredientIndex].cost! * (1 + (bonuses.costReduction / 100)));
      this.recipes[recipeIndex].ingredients[ingredientIndex].strongholdXpIncreased = Math.round(this.recipes[recipeIndex].ingredients[ingredientIndex].strongholdXp! * (1 + (bonuses.strongholdXpIncrease / 100)));
      this.recipes[recipeIndex].ingredients[ingredientIndex].craftingTimeSecondsDiscounted = Math.round(this.recipes[recipeIndex].ingredients[ingredientIndex].craftingTimeSeconds! * (1 + (bonuses.craftingTimeReduction / 100)));


      // Sum craft total cost
      if (this.recipes[recipeIndex].ingredients[ingredientIndex].ingredients) {
        this.recipes[recipeIndex].ingredients[ingredientIndex].craftTotal = (this.recipes[recipeIndex].ingredients[ingredientIndex].ingredients!).reduce((craftTotal, subIngredient) => {
          return craftTotal + (subIngredient.price || 0);
        }, 0) + this.recipes[recipeIndex].ingredients[ingredientIndex].costDiscounted!;

        // Evaluate Craft vs Buy
        if (this.recipes[recipeIndex].ingredients[ingredientIndex].craftTotal && this.recipes[recipeIndex].ingredients[ingredientIndex].price) {
          this.recipes[recipeIndex].ingredients[ingredientIndex].craftvsbuy = Math.round((-1 + (this.recipes[recipeIndex].ingredients[ingredientIndex].craftTotal! / this.recipes[recipeIndex].ingredients[ingredientIndex].price!)) * 10000) / 100;
        }

      } else {
        this.recipes[recipeIndex].ingredients[ingredientIndex].craftTotal = undefined;
      }
    }

    // Sum craft total cost (Craft sub recipes)
    this.recipes[recipeIndex].craftTotal = this.recipes[recipeIndex].ingredients.reduce((acc, ingredient) => {
      return acc + (ingredient.craftTotal ? (ingredient.craftTotal || 0) : ingredient!.price || 0);
    }, 0) + this.recipes[recipeIndex].costDiscounted!;

    // Sum partial craft total cost (Buy sub recipe ingredients)
    this.recipes[recipeIndex].partialCraftTotal = this.recipes[recipeIndex].ingredients.reduce((acc, ingredient) => {
      return acc + (ingredient!.price || 0);
    }, 0) + this.recipes[recipeIndex].costDiscounted!;

    // Evaluate Craft vs Buy
    if (this.recipes[recipeIndex].craftTotal && this.recipes[recipeIndex].price) {
      this.recipes[recipeIndex].fullCraftvsbuy = Math.round((-1 + (this.recipes[recipeIndex].craftTotal! / this.recipes[recipeIndex].price!)) * 10000) / 100;
    }
    if (this.recipes[recipeIndex].partialCraftTotal && this.recipes[recipeIndex].price) {
      this.recipes[recipeIndex].partialCraftvsbuy = Math.round((-1 + (this.recipes[recipeIndex].partialCraftTotal! / this.recipes[recipeIndex].price!)) * 10000) / 100;
    }

    // Build recommendation
    if (this.recipes[recipeIndex].craftTotal! <= this.recipes[recipeIndex].partialCraftTotal!) {
      if (this.recipes[recipeIndex].craftTotal! < this.recipes[recipeIndex].price!) {
        this.recipes[recipeIndex].recomendation = 'Craft';
      } else {
        this.recipes[recipeIndex].recomendation = 'Buy';
      }
    } else {
      if (this.recipes[recipeIndex].partialCraftTotal! < this.recipes[recipeIndex].price!) {
        this.recipes[recipeIndex].recomendation = 'Partial Craft';
      } else {
        this.recipes[recipeIndex].recomendation = 'Buy';
      }
    }

    if (this.recipes[recipeIndex].open) {
      this.recipes[recipeIndex].total = this.recipes[recipeIndex].craftTotal;
      this.recipes[recipeIndex].craftvsbuy = this.recipes[recipeIndex].fullCraftvsbuy;
    } else {
      this.recipes[recipeIndex].total = this.recipes[recipeIndex].partialCraftTotal;
      this.recipes[recipeIndex].craftvsbuy = this.recipes[recipeIndex].partialCraftvsbuy;
    }
  }

  calculateTime(craftingTime: number) {
    let time = craftingTime;
    const s = time % 60;
    time = (time - s) / 60;
    const m = time % 60;
    time = (time - m) / 60;
    const h = time % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  toggleFavorite(recipeId: string) {
    if (!this.favorites) {
      return;
    }
    const favIndex = this.favorites.findIndex(i => i == recipeId);
    if (favIndex >= 0) {
      this.favorites.splice(favIndex, 1);
    } else {
      this.favorites.push(recipeId);
    }
    localStorage.setItem('craftFavorites', JSON.stringify(this.favorites));
  }

  isFavorite(recipeId: string) {
    if (!this.favorites) {
      return false;
    }
    return this.favorites.findIndex(i => i == recipeId) >= 0;
  }
}
