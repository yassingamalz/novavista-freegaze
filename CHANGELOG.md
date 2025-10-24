# Changelog

All notable changes to NovaVista FreeGaze will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned for v1.1.0
- Fix test dependencies (vitest/jsdom)
- Cross-browser compatibility testing
- Performance optimizations
- Mobile support
- Settings panel

---

## [1.0.0] - 2025-10-24

### 🎉 Initial Public Release

First public release of NovaVista FreeGaze - open-source eye-tracking accessibility software.

### Added

#### Core Features
- **Camera Access**: WebRTC-based webcam initialization with error handling
- **Face Detection**: MediaPipe FaceMesh integration (468 landmarks + iris tracking)
- **Eye Feature Extraction**: 8-feature vector (iris position, eye aperture, symmetry)
- **9-Point Calibration**: Interactive calibration with animated points
- **ML Gaze Prediction**: TensorFlow.js neural network (8→64→32→2 architecture)
- **Gaze Smoothing**: 1€ Filter for jitter reduction
- **Dwell-Click**: 1.5s gaze fixation triggers click events
- **Visual Cursor**: Animated gaze cursor with dwell progress ring

#### UI/UX
- Modern dark theme interface
- Real-time status panel (FPS, face detection, model status)
- Mode switching (detection/calibrating/tracking)
- Control buttons (calibrate, re-calibrate, toggle modes)
- Loading states and error handling
- Calibration overlay with progress tracking
- User instructions and guidance

#### Persistence
- Model save/load from localStorage
- Calibration data persistence
- Settings preservation

#### Performance
- 25-30 FPS face detection and tracking
- <50ms gaze prediction latency
- Efficient tensor memory management
- Smooth animations (60 FPS UI)

### Technical Details

#### Architecture
```
Camera → MediaPipe → Feature Extraction → ML Model → Smoothing → Dwell Detection → Click
```

#### Tech Stack
- React 19.2.0
- MediaPipe FaceMesh 0.4.x
- TensorFlow.js 4.22.0
- WebRTC (getUserMedia)
- localStorage for persistence

#### Commits (Phase 1-4)
1. `15c38bb` - Initialize project with Create React App
2. `76af6ac` - feat(core): add camera access and face detection modules
3. `9947c2e` - feat(ui): create main app with face landmark visualization
4. `8b5de51` - chore: add dependencies and cleanup CRA template
5. `bb5dd81` - feat(core): implement eye feature extraction
6. `57bc995` - feat(ui): integrate feature extraction and display
7. `99dfdad` - feat(ui): create 9-point calibration component
8. `3edba6b` - feat(core): implement TensorFlow.js gaze prediction model
9. `3361957` - feat(utils): add smoothing filter and dwell-click detection
10. `7542c50` - feat: integrate full eye tracking system

### Known Limitations
- Requires good lighting conditions
- Accuracy degrades with head movement (re-calibration needed)
- Works best at ~60cm from camera
- Not suitable for precision tasks (e.g., graphic design)
- May cause eye fatigue with extended use

### Browser Support
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+ (tested)
- ✅ Safari 14+ (to be tested)

### System Requirements
- Modern web browser with WebRTC support
- Webcam (built-in or USB)
- 4GB+ RAM recommended
- Good lighting environment

---

## Development Phases

### Phase 1: Core Detection (Weeks 1-2) ✅
- Camera access and MediaPipe integration
- Eye feature extraction

### Phase 2: Calibration (Weeks 3-4) ✅
- 9-point calibration UI
- TensorFlow.js prediction model

### Phase 3: Refinement (Weeks 5-6) ✅
- Smoothing filters
- Dwell-click mechanism

### Phase 4: Integration (Weeks 7-8) ✅
- Full system integration
- UI polish

### Phase 5: Testing & Launch (Weeks 9-10) 🚧
- User testing
- Documentation
- Public release

---

## Future Releases

### v1.1.0 - Planned
- [ ] Blink detection for clicking
- [ ] Adjustable dwell time in settings
- [ ] Cursor size customization
- [ ] Performance improvements
- [ ] Mobile optimization (iOS/Android)

### v1.2.0 - Planned
- [ ] Virtual keyboard for typing
- [ ] Voice feedback integration
- [ ] Multiple user profiles
- [ ] Calibration quality scoring

### v2.0.0 - Planned
- [ ] Advanced ML model with more features
- [ ] Head pose compensation
- [ ] Multi-language support
- [ ] Accessibility certification
- [ ] Screen reader integration

---

## Contributors

Built with ❤️ by:
- **NovaVista Team**
- Community contributors (see GitHub)

---

## Links

- **Repository**: https://github.com/yassingamalz/novavista-freegaze
- **Issues**: https://github.com/yassingamalz/novavista-freegaze/issues
- **Discussions**: https://github.com/yassingamalz/novavista-freegaze/discussions
- **Documentation**: See `/docs` folder

---

## License

MIT License - Free and open source forever.

---

**Note**: This is an alpha release. Expect bugs and rough edges. 
Please report issues on GitHub!
