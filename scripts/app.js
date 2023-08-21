import React from 'react';
import ReactDOM from 'react-dom';
import Main from './components/Main';
import { H5PContext } from './context/H5PContext';
import { sceneRenderingQualityMapping } from './components/Scene/SceneTypes/ThreeSixtyScene';
import { purifyHTML } from './utils/utils';

export default class Wrapper extends H5P.EventDispatcher {
  constructor(params, contentId, extras) {
    super();

    extras = extras || {};

    this.forceStartScreen = (extras.forceStartScreen !== undefined
      && extras.forceStartScreen >= 0)
      ? extras.forceStartScreen : null;

    this.forceStartCamera = extras.forceStartCamera !== undefined
      ? extras.forceStartCamera : null;

    params.threeImage.scenes = Wrapper.addUniqueIdsToInteractions(params.threeImage.scenes);
    params.threeImage.scenes = Wrapper.addMissingLabelSettings(params.threeImage.scenes);

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
      const isFullscreen = (
        this.wrapper.parentElement.classList.contains('h5p-fullscreen') ||
        this.wrapper.parentElement.classList.contains('h5p-semi-fullscreen')
      );
      const rect = this.getRect();
      // Fullscreen should use all of the space
      const ratio = (isFullscreen ? (rect.height / rect.width) : (9 / 16));

      this.wrapper.style.height = isFullscreen ?
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
      if (this.currentScene === null || !this.threeSixty) {
        return;
      }

      const updatedRect = this.wrapper.getBoundingClientRect();
      this.threeSixty.resize(updatedRect.width / updatedRect.height);
    });
  }

  setCurrentSceneId(sceneId) {
    this.currentScene = sceneId;

    this.trigger('changedScene', sceneId);

    ReactDOM.render(
      <H5PContext.Provider value={this}>
        <Main
          forceStartScreen={this.forceStartScreen}
          forceStartCamera={this.forceStartCamera}
          currentScene={this.currentScene}
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

  reDraw(forceStartScreen = this.currentScene) {
    const sceneRenderingQuality = this.behavior.sceneRenderingQuality;
    if (sceneRenderingQuality !== this.sceneRenderingQuality
      && this.threeSixty) {
      this.setSceneRenderingQuality(sceneRenderingQuality);
    }

    if (forceStartScreen !== this.currentScene) {
      this.setCurrentSceneId(forceStartScreen);
      return;
    }

    ReactDOM.render(
      <H5PContext.Provider value={this}>
        <Main
          forceStartScreen={this.forceStartScreen}
          forceStartCamera={this.forceStartCamera}
          currentScene={this.currentScene}
          setCurrentSceneId={this.setCurrentSceneId.bind(this)}
          addThreeSixty={(tS) => this.threeSixty = tS}
          onSetCameraPos={this.setCameraPosition.bind(this)} />
      </H5PContext.Provider>,
      this.wrapper
    );
  }

  attach($container) {
    const createElements = () => {
      this.wrapper = document.createElement('div');
      this.wrapper.classList.add('h5p-three-sixty-wrapper');

      this.currentScene = this.params.startSceneId;
      if (this.forceStartScreen) {
        this.currentScene = this.forceStartScreen;
      }

      ReactDOM.render(
        <H5PContext.Provider value={this}>
          <Main
            forceStartScreen={this.forceStartScreen}
            forceStartCamera={this.forceStartCamera}
            currentScene={this.currentScene}
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

  getRect() {
    return this.wrapper.getBoundingClientRect();
  }

  getRatio() {
    const rect = this.wrapper.getBoundingClientRect();
    return (rect.width / rect.height);
  }

  setCameraPosition(cameraPosition, focus) {
    if (this.currentScene === null || !this.threeSixty) {
      return;
    }

    const [yaw, pitch] = cameraPosition.split(',');
    this.threeSixty.setCameraPosition(parseFloat(yaw), parseFloat(pitch));
    if (focus) {
      this.threeSixty.focus();
    }
  }

  getCamera() {
    if (this.currentScene === null || !this.threeSixty) {
      return;
    }

    return {
      camera: this.threeSixty.getCurrentPosition(),
      fov: this.threeSixty.getCurrentFov(),
    };
  }

  setSceneRenderingQuality(quality) {
    const segments = sceneRenderingQualityMapping[quality];
    this.threeSixty.setSegmentNumber(segments);
    this.sceneRenderingQuality = quality;
  }

  /**
    * Add unique ids to interactions.
    * The ids are used as key for mapping React components.
    * TODO: Create the ids in editor-time and store them in semantics
    *
    * @param {Array<SceneParams>} scenes
    * @returns {Array<SceneParams>}
    */
  static addUniqueIdsToInteractions(scenes) {
    return scenes?.map((scene) => scene.interactions
      ? ({
        ...scene,
        interactions: scene.interactions?.map(
          (interaction) => ({ ...interaction, id: H5P.createUUID() })
        ),
      })
      : scene
    );
  }
  /**
     * Older interactions are missing label settings.
     * This adds an empty `label` to avoid adding null checks everywhere.
     * TODO: Add this to upgrades.json
     *
     * @param {Array<SceneParams>} scenes
     * @returns {Array<SceneParams>}
     */
  static addMissingLabelSettings(scenes) {
    return scenes?.map((scene) => scene.interactions
      ? ({
        ...scene,
        interactions: scene.interactions?.map(
          (interaction) => ({ ...interaction, label: interaction.label ?? {} })
        ),
      })
      : scene
    );
  }
}
