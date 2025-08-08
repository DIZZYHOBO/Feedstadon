export const ICONS = {
    reply: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M10,9V5L3,12L10,19V14.9C15,14.9 18.5,16.5 21,20C20,15 17,10 10,9Z" /></svg>`,
    boost: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M13,5.5L6,12.5H11V18.5H13V12.5H18L13,5.5M6,20.5H18V22.5H6V20.5Z" /></svg>`,
    favorite: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" /></svg>`,
    bookmark: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3Z" /></svg>`,
    more: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>`,
    notifications: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,22A2,2 0 0,0 14,20H10A2,2 0 0,0 12,22M18,16V11C18,7.93 16.36,5.36 13.5,4.68V4A1.5,1.5 0 0,0 12,2.5A1.5,1.5 0 0,0 10.5,4V4.68C7.64,5.36 6,7.93 6,11V16L4,18V19H20V18L18,16Z" /></svg>`,
    refresh: `<svg class="icon" viewBox="0 0 24 24">
        <style>
            .refresher {
                transform-origin: center;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        </style>
        <path class="refresher" fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
    </svg>`,
    edit: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.13,5.12L18.88,8.87M3,17.25V21H6.75L17.81,9.94L14.06,6.19L3,17.25Z" /></svg>`,
    delete: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>`,
    mention: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M4,10H6V14H4V10M10,10H8V14H10V10M13.5,10A1.5,1.5 0 0,0 12,11.5A1.5,1.5 0 0,0 13.5,13A1.5,1.5 0 0,0 15,11.5A1.5,1.5 0 0,0 13.5,10M18,10H16V14H18V10M20,2H22V22H2V2H4V8H20V2Z" /></svg>`,
    comments: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z" /></svg>`,
    save: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>`,
    lemmy: `<svg class="icon" viewBox="0 0 128 128"><path fill="currentColor" d="M128 92.54a10.35 10.35 0 0 1-1.46 5.13a10.28 10.28 0 0 1-14 5.23L42.25 64l70.25-38.9a10.28 10.28 0 0 1 14 5.23a10.35 10.35 0 0 1-1.46 5.13L68.81 64l57.73 28.54zM24.73 99.34a10.28 10.28 0 0 1-14-5.23a10.35 10.35 0 0 1 1.46-5.13L59.38 64L12.19 25.1a10.35 10.35 0 0 1-1.46-5.13a10.28 10.28 0 0 1 14-5.23L85.75 64L24.73 99.34z"/></svg>`,
    lemmyUpvote: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,20L18,14H13V4H11V14H6M1,12A1,1 0 0,1 2,11H5V13H2A1,1 0 0,1 1,12M22,12A1,1 0 0,1 21,13H19V11H21A1,1 0 0,1 22,12Z" /></svg>`,
    lemmyDownvote: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,4L6,10H11V20H13V10H18M1,12A1,1 0 0,0 2,13H5V11H2A1,1 0 0,0 1,12M22,12A1,1 0 0,0 21,11H19V13H21A1,1 0 0,0 22,12Z" /></svg>`,
    mastodon: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20.94,14C20.44,16.25 18.25,17.44 15.69,17.5C13.12,17.56 11.25,16.5 10,14.5C8.75,12.5 8.75,10.25 8.75,10.25C8.75,10.25 8.81,10.19 8.81,10.12C10.19,9.5 10.88,9.38 10.88,9.38C10.88,9.38 10.88,9.88 10.94,10.38C11.31,12.12 12.19,12.62 13.31,12.81C14.44,13 15.31,12.62 15.31,11.38C15.31,10.12 15.12,9.69 14.94,9.5C13.56,8.5 13.12,7.38 13.12,6.06C13.12,4.38 14.12,3.44 16,3.19V2H17.44V3.12C19,3.31 19.69,4.25 19.75,5.69H18.19C18.19,5.06 18,4.62 17.38,4.5C16.5,4.31 15.94,4.5 15.94,5.31C15.94,5.88 16.12,6.12 16.69,6.5C17.75,7.31 18.31,8.19 18.31,9.69C18.31,10.88 17.81,12 16.88,12.63C16.19,13.06 15,13.31 13.81,13.12C12.62,12.94 11.88,12.31 11.44,10.88C11.38,10.69 11.31,10.31 11.31,9.88C11.31,9.75 11.25,9.69 11.19,9.62C11.19,9.62 11.12,9.69 11.12,9.75C11.12,10.06 10.81,12.56 12.19,14.31C13,15.5 14.19,16.12 15.81,16.06C17.44,16 18.94,15.19 19.5,13.69L20.94,14M3,2H21V22H3V2Z" /></svg>`,
    screenshot: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M15,2H17V5H15V2M19,2H21V5H19V2M19,22H21V19H19V22M15,22H17V19H15V22M13,18H11V15H8V13H11V10H13V13H16V15H13V18M5,2H7V5H5V2M9,2H11V5H9V2M5,22H7V19H5V22M9,22H11V19H9V22M22,7H19V9H22V7M22,11H19V13H22V11M22,15H19V17H22V15M5,7H2V9H5V7M5,11H2V13H5V11M5,15H2V17H5V15Z" /></svg>`,
    watermark: `<svg class="icon" viewBox="0 0 200 40"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="currentColor">Feeds</text></svg>`,
    media: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
    poll: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z" /></svg>`,
    warning: `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16" /></svg>`
};
