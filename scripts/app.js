import React from 'react';
import ReactDOM from 'react-dom';
import Main from './components/Main';
import { H5PContext } from './context/H5PContext';
import { sceneRenderingQualityMapping } from './components/Scene/SceneTypes/ThreeSixtyScene';
import { purifyHTML } from './utils/utils';

export default class Wrapper extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    this.enforcedStartSceneId = extras.forceStartScreen >= 0 || null;
    this.forceStartCamera = extras.forceStartCamera ?? null;

    // TODO: Parameter sanitization

    params.threeImage.scenes = Wrapper.addUniqueIdsToInteractions(params.threeImage.scenes);

    this.behavior = {
      label: {
        showLabel: false,
        labelPosition: 'right',
        ...params.behaviour?.label
      },
      ...params.behaviour
    };

    this.l10n = {
      // Text defaults
      title: 'Virtual Tour',
      playAudioTrack: 'Play Audio Track',
      pauseAudioTrack: 'Pause Audio Track',
      sceneDescription: 'Scene Description',
      resetCamera: 'Reset Camera',
      submitDialog: 'Submit Dialog',
      closeDialog: 'Close Dialog',
      expandButtonAriaLabel: 'Expand the visual label',
      goToStartScene: 'Go to start scene',
      userIsAtStartScene: 'You are at the start scene',
      unlocked: 'Unlocked',
      locked: 'Locked',
      searchRoomForCode: 'Search the room until you find the code',
      wrongCode: 'The code was wrong, try again.',
      contentUnlocked: 'The content has been unlocked!',
      code: 'Code',
      showCode: 'Show code',
      hideCode: 'Hide code',
      unlockedStateAction: 'Continue',
      lockedStateAction: 'Unlock',
      hotspotDragHorizAlt: 'Drag horizontally to scale hotspot',
      hotspotDragVertiAlt: 'Drag vertically to scale hotspot',
      backgroundLoading: 'Loading background image...',
      noContent: 'No content',
      hint: 'Hint',
      lockedContent: 'Locked content',
      ...params.l10n,
    };

    // Parameters has been wrapped in the threeImage widget group
    if (params.threeImage) {
      params = params.threeImage;
    }

    this.params = params || {};
    this.params.scenes = this.params.scenes ?? [];

    // Sanitize scene description aria that was entered as HTML
    this.params.scenes = this.params.scenes.map((sceneParams) => {
      if (sceneParams.sceneDescriptionARIA) {
        sceneParams.sceneDescriptionARIA = purifyHTML(sceneParams.sceneDescriptionARIA);
      }

      return sceneParams;
    });

    // Sanitize localization
    for (const key in this.l10n) {
      this.l10n[key] = purifyHTML(this.l10n[key]);
    }

    this.contentId = contentId;
    this.extras = extras;
    this.sceneRenderingQuality = this.behavior.sceneRenderingQuality || 'high';

    this.on('resize', () => {
      const rect = this.getRect();
      // Fullscreen should use all of the space
      const ratio = (H5P.isFullscreen ? (rect.height / rect.width) : (9 / 16));

      this.wrapper.style.height = H5P.isFullscreen ?
        '100%' :
        `${rect.width * ratio}px`;

      // Apply separate styles for mobile
      if (rect.width <= 480) {
        this.wrapper.classList.add('h5p-phone-size');
      }
      else {
        this.wrapper.classList.remove('h5p-phone-size');
      }
      if (rect.width < 768) {
        this.wrapper.classList.add('h5p-medium-tablet-size');
      }
      else {
        this.wrapper.classList.remove('h5p-medium-tablet-size');
      }

      // Resize scene
      if (this.currentSceneId === null || !this.threeSixty) {
        return;
      }

      const updatedRect = this.wrapper.getBoundingClientRect();
      this.threeSixty.resize(updatedRect.width / updatedRect.height);
    });
  }

  /**
   * Set current scene id.
   * @param {number} sceneId Scene id.
   */
  setCurrentSceneId(sceneId) {
    this.currentSceneId = sceneId;

    this.trigger('changedScene', sceneId);

    ReactDOM.render(
      <H5PContext.Provider value={this}>
        <Main
          forceStartScreen={this.enforcedStartSceneId}
          forceStartCamera={this.forceStartCamera}
          currentScene={this.currentSceneId}
          setCurrentSceneId={this.setCurrentSceneId.bind(this)}
          addThreeSixty={(tS) => this.threeSixty = tS}
          onSetCameraPos={this.setCameraPosition.bind(this)} />
      </H5PContext.Provider>,
      this.wrapper
    );

    window.requestAnimationFrame(() => {
      this.trigger('resize');
    });
  }

  /**
   * Redraw scene.
   * @param {number} [enforcedStartSceneId] If set, enforce drawing respective scene.
   */
  reDraw(enforcedStartSceneId = this.currentSceneId) {
    const sceneRenderingQuality = this.behavior.sceneRenderingQuality;

    if (
      sceneRenderingQuality !== this.sceneRenderingQuality && this.threeSixty
    ) {
      this.setSceneRenderingQuality(sceneRenderingQuality);
    }

    if (enforcedStartSceneId !== this.currentSceneId) {
      // TODO: That will also re-render the DOM. Could this be made simpler?
      this.setCurrentSceneId(enforcedStartSceneId);
      return;
    }

    ReactDOM.render(
      <H5PContext.Provider value={this}>
        <Main
          forceStartScreen={this.enforcedStartSceneId}
          forceStartCamera={this.forceStartCamera}
          currentScene={this.currentSceneId}
          setCurrentSceneId={this.setCurrentSceneId.bind(this)}
          addThreeSixty={(tS) => this.threeSixty = tS}
          onSetCameraPos={this.setCameraPosition.bind(this)} />
      </H5PContext.Provider>,
      this.wrapper
    );
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $container Content's container.
   */
  attach($container) {
    const createElements = () => {
      this.wrapper = document.createElement('div');
      this.wrapper.classList.add('h5p-three-sixty-wrapper');

      this.currentSceneId = this.params.startSceneId;
      if (this.enforcedStartSceneId) {
        this.currentSceneId = this.enforcedStartSceneId;
      }

      // TODO: The scene is rendered in re-draw ans setCurrentScene, too. Could this be made simpler?
      ReactDOM.render(
        <H5PContext.Provider value={this}>
          <Main
            forceStartScreen={this.enforcedStartSceneId}
            forceStartCamera={this.forceStartCamera}
            currentScene={this.currentSceneId}
            setCurrentSceneId={this.setCurrentSceneId.bind(this)}
            addThreeSixty={(tS) => this.threeSixty = tS}
            onSetCameraPos={this.setCameraPosition.bind(this)}
            isVeryFirstRender={true} />
        </H5PContext.Provider>,
        this.wrapper
      );
    };

    /*
      * Temporary (fingers crossed) hotfix for Firefox on Edlib.
      * When overflow is set to `hidden` on Edlib (Why? H5P resizes the iframe
      * that the document lives in), then Firefox will not detect hotspots
      * as hovered/being clickable. Even with the `overflow` setting removed,
      * Firefox does require hotspots to be quite centered. When close to the
      * visible border of the scene, Firefox does not consider the hotspots
      * to be hovered/clicked.
      */
    document.body.style.overflow = '';

    if (!this.wrapper) {
      createElements();
    }

    // Append elements to DOM
    $container[0].appendChild(this.wrapper);
    $container[0].classList.add('h5p-three-image');
  }

  /**
   * Get informaton about size/position of wrapper relative to viewport.
   * @returns {DOMRect} Informaton about size/position of wrapper.
   */
  getRect() {
    return this.wrapper.getBoundingClientRect();
  }

  /**
   * Get current size ratio of wrapper.
   * @returns {number} Current size ratio of wrapper.
   */
  getRatio() {
    const rect = this.wrapper.getBoundingClientRect();
    return (rect.width / rect.height);
  }

  /**
   * Set camera position.
   * @param {string} cameraPosition Camera position as `yaw,pitch` where yaw/pitch are floats.
   * @param {boolean} focus If true, set focus to scene after setting position.
   */
  setCameraPosition(cameraPosition, focus) {
    if (this.currentSceneId === null || !this.threeSixty) {
      return; // No scene available to set camera position for.
    }

    const [yaw, pitch] = cameraPosition.split(',');
    this.threeSixty.setCameraPosition(parseFloat(yaw), parseFloat(pitch));

    if (focus) {
      this.threeSixty.focus();
    }
  }

  /**
   * Get camera position and field of view.
   * @returns {object|undefined} Camera position and field of view.
   */
  getCamera() {
    if (this.currentSceneId === null || !this.threeSixty) {
      return; // No scene available to get information for.
    }

    return {
      camera: this.threeSixty.getCurrentPosition(),
      fov: this.threeSixty.getCurrentFov(),
    };
  }

  /**
   * Set rendering quality of scene.
   * @param {string} quality Quality as defined in semantics [high|medium|low].
   */
  setSceneRenderingQuality(quality) {
    const segments = sceneRenderingQualityMapping[quality];
    this.threeSixty.setSegmentNumber(segments);
    this.sceneRenderingQuality = quality;
  }

  /**
   * Add unique ids to interactions as key for mapping React components.
   * @param {object[]} sceneParams Scene parameters
   * @returns {object[]} Scene parameters including ids.
   */
  static addUniqueIdsToInteractions(sceneParams) {
    return sceneParams?.map((sceneParam) => {
      if (sceneParam.interactions) {
        sceneParam.interactions = sceneParam.interactions?.map(
          (interaction) => ({ ...interaction, id: H5P.createUUID() })
        );
      }

      return sceneParam;
    });
  }
}
