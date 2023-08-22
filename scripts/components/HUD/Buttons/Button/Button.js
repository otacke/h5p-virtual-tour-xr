import React from 'react';
import './Button.scss';

export default class AudioButton extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
  }

  /**
   * Handle click.
   */
  handleClick = () => {
    if (!this.props.disabled) {
      this.props.onClick();
    }
  };

  /**
   * React life-cycle handler: Component did update.
   * @param {object} prevProps Props before update
   */
  componentDidUpdate(prevProps) {
    if (
      prevProps.nextFocus !== this.props.nextFocus &&
      this.props.type === this.props.nextFocus
    ) {
      this.element.focus();
    }
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    return (
      <div className="btn-wrap">
        <button
          ref={ (el) => this.element = el }
          className={ 'hud-btn ' + this.props.type }
          onClick={ this.handleClick }
          aria-label={ this.props.label }
          disabled={ !!this.props.disabled }
          tabIndex={ this.props.isHiddenBehindOverlay ? '-1' : undefined }
        />
        <div className="tooltip" aria-hidden="true">
          <div className="text-wrap">{ this.props.label }</div>
        </div>
      </div>
    );
  }
}
