export const ICONS = {
    reply: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M10,9V5L3,12L10,19V14.9C15,14.9 18.5,16.5 21,20C20,15 17,10 10,9Z" /></svg>`,
    boost: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7,7H17V2L22,9L17,16V11H9V13L7,11V7M17,17H7V22L2,15L7,8V13H15V11L17,13V17Z" /></svg>`,
    favorite: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" /></svg>`,
    bookmark: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3Z" /></svg>`,
    more: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>`,
    poll: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3,22V8H7V22H3M10,22V2H14V22H10M17,22V14H21V22H17Z" /></svg>`,
    refresh: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" /></svg>`,
    media: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" /></svg>`,
    warning: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16" /></svg>`,
    message: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg>`,
    notifications: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 0 1-3.46 0"></path></svg>`,
    lemmyUpvote: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,2L2,12H7V22H17V12H22L12,2Z" /></svg>`,
    lemmyDownvote: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,22L22,12H17V2H7V12H2L12,22Z" /></svg>`,
    edit: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.13,5.12L18.88,8.87M3,17.25V21H6.75L17.81,9.94L14.06,6.19L3,17.25Z" /></svg>`,
    delete: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>`,
    // --- NEW ICON ADDED HERE ---
    lemmy: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M21.9,8.9C21.8,8.8,21.6,8.8,21.5,8.8H17.2V5.1C17.2,5,17.2,4.8,17.1,4.7C17,4.6,16.8,4.6,16.7,4.6H7.3C7.2,4.6,7,4.6,6.9,4.7C6.8,4.8,6.8,5,6.8,5.1V8.8H2.5C2.4,8.8,2.2,8.8,2.1,8.9C2,9,2,9.2,2,9.3L4.9,19C4.9,19.1,5,19.2,5.1,19.3C5.2,19.4,5.4,19.4,5.5,19.4H18.5C18.6,19.4,18.8,19.4,18.9,19.3C19,19.2,19.1,19.1,19.1,19L22,9.3C22,9.2,22,9,21.9,8.9M15.2,8.8H8.8V6.6H15.2V8.8Z" /></svg>`
};
