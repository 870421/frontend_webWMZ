# WeatherMapZ Frontend - Codex Instructions

This repository contains the WeatherMapZ frontend.

Before substantial changes, read the global WeatherMapZ documentation
and this file.

## Stack

- React
- Vite
- PWA
- Leaflet
- OpenStreetMap

## Responsive design

Use Mobile-First Responsive Web Design.

The SAME application must work correctly on:

- smartphones
- tablets
- desktop/laptop browsers

Do not create separate mobile and desktop applications.

All relevant interactions must support touch devices and desktop input.

## Responsibilities

The frontend handles:

- interactive map
- origin/destination interaction
- route visualization
- route comparison
- comfort information
- loading/error states
- responsive UI
- backend API communication

Do NOT implement core routing or climatic-comfort calculations here.

## Map UX

The map is the central element of the application.

Mobile:
- prioritize map visibility
- compact controls
- collapsible panels/bottom sheets where appropriate

Desktop:
- sidebars or expanded panels may use additional screen space

Functionality should remain equivalent across screen sizes.

## Architecture

Prefer clear separation between:

- presentation components
- features
- hooks
- API/services
- utilities

Do not over-engineer the folder structure before it is needed.

## API communication

Centralize backend communication.

Do not scatter fetch/API calls throughout presentation components.

Do not invent backend endpoints or response properties.

If a required API contract does not exist, define or confirm it before
implementing frontend integration.

## Accessibility

Use:

- semantic HTML
- accessible controls
- keyboard navigation where appropriate
- sufficient contrast
- meaningful labels

Do not rely only on color to distinguish routes.

## Testing

Use Jest + React Testing Library.

Minimum automated coverage: 50%.
Target: 75%.

## Configuration

Do not hardcode backend URLs, credentials or environment-specific values.

Use environment variables where appropriate.