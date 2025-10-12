
import { NotificationManager, NotificationTypes } from './notificationSystem.js';
import { checkPostExpiry } from './fraudPrevention.js';

export class PostExpiryManager {
  static async checkAllPostsExpiry() {
    // Fetch posts from backend API
    const allPosts = await this.getAllPosts();
    if (!Array.isArray(allPosts)) return;
    for (const post of allPosts) {
      await this.processPostExpiry(post);
    }
  }

  static async processPostExpiry(post) {
    const expiryInfo = checkPostExpiry(post.postedDate);
    if (expiryInfo.daysRemaining <= 3 && expiryInfo.daysRemaining > 0) {
      // Send expiry warning
      NotificationManager.sendNotification(
        post.sellerId,
        NotificationTypes.POST_EXPIRY_WARNING,
        {
          postId: post.id,
          daysLeft: expiryInfo.daysRemaining,
          title: post.title
        }
      );
    } else if (expiryInfo.isExpired && post.status === 'Active') {
      // Mark as expired and move to Sale Undone
      await this.moveToSaleUndone(post);
    }
  }

  static async moveToSaleUndone(post) {
    // Update post status in backend
    const updatedPost = {
      ...post,
      status: 'Sale_Undone',
      movedToSaleUndoneAt: new Date().toISOString(),
      priority: 'high'
    };
    await fetch(`http://localhost:5000/api/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPost)
    });
    // Notify seller about repost opportunity
    NotificationManager.sendNotification(
      post.sellerId,
      NotificationTypes.REPOST_OPPORTUNITY,
      {
        postId: post.id,
        title: post.title,
        message: 'Your post has expired. You can repost it for better visibility.'
      }
  // Removed stray parenthesis and fixed class structure
    );
  }

  static async getTopListings() {
    const allPosts = await this.getAllPosts();
    return {
      saleUndone: allPosts.filter(post => post.status === 'Sale_Undone').sort((a, b) => new Date(b.movedToSaleUndoneAt) - new Date(a.movedToSaleUndoneAt)),
      leastViewed: allPosts.filter(post => post.status === 'Active').sort((a, b) => a.views - b.views).slice(0, 10),
      topSellers: allPosts.filter(post => post.sellerVerified && post.sellerRank === 'Gold Seller').sort((a, b) => b.views - a.views)
    };
  }

  static async getAllPosts() {
    // Fetch posts from backend API
    const res = await fetch('http://localhost:5000/api/posts');
    return await res.json();
  }

  static async updatePost(post) {
    // Update post in backend
    await fetch(`http://localhost:5000/api/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
  }

  // Run expiry check daily
  static startExpiryScheduler() {
    // Check immediately
    this.checkAllPostsExpiry();
    // Then check every 24 hours
    setInterval(() => {
      this.checkAllPostsExpiry();
    }, 24 * 60 * 60 * 1000);
  }
}

// Auto-start the expiry scheduler when the module loads
PostExpiryManager.startExpiryScheduler();
