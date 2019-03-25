import React from 'react';

export class BuyMeACoffee extends React.PureComponent {
  public render() {
    return (
      <>
        <a className="bmc-button" target="_blank" href="https://www.buymeacoffee.com/jdcannyengineer">
          <img src="https://www.buymeacoffee.com/assets/img/BMC-btn-logo.svg" alt="Buy me a coffee" />
          <span>Buy me a coffee</span>
        </a>
        {/* <link href="https://fonts.googleapis.com/css?family=Cookie" rel="stylesheet">
                </link> */}
      </>
    );
  }
}
