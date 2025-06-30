// src/services/eventService.js

const eventService = {
  // A simple event bus for cross-component communication
  
  // A map to store event listeners
  events: {},

  // Subscribe to an event
  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // Return an unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  },

  // Dispatch an event
  dispatchEvent(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  },
};

export default eventService;