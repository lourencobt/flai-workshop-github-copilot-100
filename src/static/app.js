document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const calendarGrid = document.getElementById("calendar-grid");
  
  // View switching
  const navBtns = document.querySelectorAll(".nav-btn");
  const viewContents = document.querySelectorAll(".view-content");
  
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const viewType = btn.dataset.view;
      
      // Update active button
      navBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Update active view
      viewContents.forEach(v => v.classList.remove("active"));
      document.getElementById(`${viewType}-view`).classList.add("active");
      
      // Load calendar if switching to calendar view
      if (viewType === "calendar") {
        fetchCalendar();
      }
    });
  });

  // Function to parse schedule and extract day and time
  function parseSchedule(schedule) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const foundDays = [];
    
    days.forEach(day => {
      if (schedule.includes(day) || schedule.includes(day + "s")) {
        foundDays.push(day);
      }
    });
    
    // Extract time (look for pattern like "3:30 PM")
    const timeMatch = schedule.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    const time = timeMatch ? timeMatch[0] : "";
    
    return { days: foundDays, time };
  }

  // Function to create calendar view
  async function fetchCalendar() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      
      calendarGrid.innerHTML = `
        <div class="calendar-header">
          ${weekDays.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
        </div>
        <div class="calendar-body">
          ${weekDays.map(day => `<div class="calendar-day" data-day="${day}"></div>`).join('')}
        </div>
      `;

      // Populate activities into calendar
      Object.entries(activities).forEach(([name, details]) => {
        const { days, time } = parseSchedule(details.schedule);
        
        days.forEach(day => {
          const dayColumn = calendarGrid.querySelector(`[data-day="${day}"]`);
          if (dayColumn) {
            const activityCard = document.createElement("div");
            activityCard.className = "calendar-activity-card";
            
            const spotsLeft = details.max_participants - details.participants.length;
            
            activityCard.innerHTML = `
              <div class="calendar-activity-name">${name}</div>
              <div class="calendar-activity-time">${time}</div>
              <div class="calendar-activity-spots">${spotsLeft}/${details.max_participants} spots</div>
            `;
            
            dayColumn.appendChild(activityCard);
          }
        });
      });
    } catch (error) {
      calendarGrid.innerHTML = "<p>Failed to load calendar. Please try again later.</p>";
      console.error("Error fetching calendar:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Create participants list HTML
        const participantsList = details.participants.length > 0
          ? `<ul class="participants-list">
               ${details.participants.map(email => `
                 <li>
                   ${email}
                   <button class="delete-btn" data-activity="${name}" data-email="${email}" title="Unregister participant">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                       <path d="M3 6h18"></path>
                       <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                       <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                     </svg>
                   </button>
                 </li>
               `).join('')}
             </ul>`
          : '<p class="no-participants">No participants yet</p>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p class="participants-header"><strong>Participants:</strong></p>
            ${participantsList}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        
        // Refresh activities list
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle delete button clicks
  activitiesList.addEventListener("click", async (event) => {
    const deleteBtn = event.target.closest(".delete-btn");
    if (!deleteBtn) return;

    const activity = deleteBtn.dataset.activity;
    const email = deleteBtn.dataset.email;

    if (!confirm(`Are you sure you want to unregister ${email} from ${activity}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        
        // Refresh activities list
        fetchActivities();
        
        // Refresh calendar if visible
        const calendarView = document.getElementById("calendar-view");
        if (calendarView.classList.contains("active")) {
          fetchCalendar();
        }

        // Hide message after 5 seconds
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 5000);
      } else {
        messageDiv.textContent = result.detail || "Failed to unregister";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
