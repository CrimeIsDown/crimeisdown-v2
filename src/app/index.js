'use strict';

angular.module('crimeisdown', ['ngResource', 'ngSanitize', 'ui.router', 'ui.bootstrap'])
  .config(function ($stateProvider, $urlRouterProvider, $sceDelegateProvider) {
    $stateProvider
      .state('home', {
        url: '/',
        templateUrl: 'app/main/main.html',
        controller: 'MainCtrl'
      })
      .state('aboutUs', {
        url: '/about',
        templateUrl: 'app/static/about.html',
        controller: 'StaticCtrl'
      })
      .state('live', {
        url: '/is-crime-down',
        templateUrl: 'app/static/live.html',
        controller: 'StaticCtrl'
      })
      .state('gettingStarted', {
        url: '/getting-started',
        templateUrl: 'app/static/getting-started.html',
        controller: 'StaticCtrl'
      })
      .state('ethics', {
        url: '/ethics',
        templateUrl: 'app/static/ethics.html',
        controller: 'StaticCtrl'
      })
      ;

    $urlRouterProvider.otherwise('/');

    $sceDelegateProvider.resourceUrlWhitelist([
      // Allow same origin resource loads.
      'self',
      // Allow loading from Broadcastify
      'http://relay.broadcastify.com/**'
    ]);
  })
;
