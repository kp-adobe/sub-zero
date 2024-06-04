import { fetchPlaceholders, createOptimizedPicture } from '../../scripts/aem.js';

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
		aSlide.classList.remove('active')

      } else {
        link.removeAttribute('tabindex');
		aSlide.classList.add('active');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('disabled');
    } else {
      indicator.querySelector('button').setAttribute('disabled', 'true');
    }
  });
}

function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
  
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

async function fetchJson(link) {
  const response = await fetch(link?.href);
  if (response.ok) {
	const jsonData = await response.json();
	const data = jsonData?.data;
	return data;
  }
	return `an error occurred, ${link}`;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  const isJSONCarousel = block.classList.contains('product') || block.classList.contains('teaser');

  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = isJSONCarousel.length < 2 && rows.length < 2;
  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', placeholders.carouselSlideControls || 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class= "slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
      <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
    `;

    container.append(slideNavButtons);
  }

  // render JSON data in carousel   
  if(isJSONCarousel){  
	const link = block.querySelector('div > a');
	const linkWrapper = link.closest('div:not(.button-container)');
  	const cardData = await fetchJson(link);

	cardData.forEach((card, idx) => {		
		const createdSlide = document.createElement('li');
		createdSlide.dataset.slideIndex = idx;
		createdSlide.setAttribute('id', `carousel-${carouselId}-slide-${idx}`);
		createdSlide.classList.add('carousel-slide');

		const isTeaser = block.classList.contains('teaser');
		
		var pictureUrl = '';
		var logoUrl = '';
		if(!isTeaser){
			pictureUrl = card.image;
		} else {
			pictureUrl = card.teaserImage;
			logoUrl = card.teaserLogo
		}

		const optimizedPicture = createOptimizedPicture(pictureUrl, card.teaserTitle, false, [{ width: 900 }]);

		const optimizedLogo = createOptimizedPicture(logoUrl, card.brand, false, [{ width: 320 }]);
		optimizedLogo.lastElementChild.width = '320';
		optimizedLogo.lastElementChild.height = '180';

		if(isTeaser){
			optimizedPicture.lastElementChild.width = '555';
			optimizedPicture.lastElementChild.height = '701';

			createdSlide.innerHTML = `
				<div class="logo-wrapper">
					${optimizedLogo.outerHTML}
				</div>
				<div class="flex-wrapper">
					<div class="slide-image">
						${optimizedPicture.outerHTML}
					</div>
					<div class="slide-body">
						<h4>${card.teaserTitle}</h4>
						<div class="content">
							<p>${card.teaserText}</p>
						</div>
						<p class="button-container">
							<a href="${card.buttonLink}" aria-label="${card['anchor-text']}" title="${card['anchor-text']}" class="button">
								${card.buttonLinkText}
							</a>
						</p>
					</div>
				</div>
			`
	  	} else {
			optimizedPicture.lastElementChild.width = '275';
			optimizedPicture.lastElementChild.height = '275';
			createdSlide.innerHTML = `
				<div class="slide-image">
					${optimizedPicture.outerHTML}
				</div>
				<div class="slide-body">
					<p class="button-container">
						<a href="${card.url}" aria-label="${card['anchor-text']}" title="${card['anchor-text']}" class="button">
						${card.title}
						</a>
					</p>
				</div>
			`
	  	}

		const labeledBy = createdSlide.querySelector('h1, h2, h3, h4, h5, h6');
		if (labeledBy) {
			createdSlide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
		}

		slidesWrapper.append(createdSlide);

		if (slideIndicators) {
			const indicator = document.createElement('li');
			indicator.classList.add('carousel-slide-indicator');
			indicator.dataset.targetSlide = idx;
			indicator.innerHTML = `<button type="button"><span>${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${cardData.length}</span></button>`;
			slideIndicators.append(indicator);
		}

		linkWrapper.remove();
	});
  } else {
	rows.forEach((row, idx) => {
		const slide = createSlide(row, idx, carouselId);
		slidesWrapper.append(slide);

		if (slideIndicators) {
		const indicator = document.createElement('li');
		indicator.classList.add('carousel-slide-indicator');
		indicator.dataset.targetSlide = idx;
		indicator.innerHTML = `<button type="button"><span>${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}</span></button>`;
		slideIndicators.append(indicator);
		}
		row.remove();
	});
  }
  container.append(slidesWrapper);
  block.prepend(container);

  if(!isSingleSlide) {
    bindEvents(block);
  }
}