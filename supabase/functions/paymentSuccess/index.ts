// supabase/functions/paymentSuccess/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  
  // Always return HTML - no authentication required
  const isSuccess = url.searchParams.has('session_id') || url.pathname.includes('success');
  
  if (isSuccess) {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Successful</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              text-align: center; 
              padding: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              background: white; 
              padding: 40px; 
              border-radius: 20px; 
              max-width: 400px; 
              width: 100%;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              animation: slideUp 0.5s ease-out;
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .success { color: #28a745; font-size: 64px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 20px; font-size: 28px; }
            p { color: #666; margin-bottom: 30px; line-height: 1.6; }
            .button { 
              background: #007bff; 
              color: white; 
              padding: 15px 30px; 
              border: none; 
              border-radius: 10px; 
              text-decoration: none; 
              display: inline-block; 
              font-weight: 600;
              transition: background 0.3s;
            }
            .button:hover { background: #0056b3; }
            .session-id { 
              background: #f8f9fa; 
              padding: 10px; 
              border-radius: 8px; 
              font-family: monospace; 
              font-size: 12px; 
              color: #6c757d; 
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅</div>
            <h1>Payment Successful!</h1>
            <p>Your credits have been added to your account. You can now close this window and return to the app to start using your credits.</p>
            ${sessionId ? `<div class="session-id">Session: ${sessionId}</div>` : ''}
            <br><br>
            <a href="#" onclick="window.close(); return false;" class="button">Close Window</a>
          </div>
          <script>
            // Auto-close after 10 seconds
            setTimeout(() => {
              try { window.close(); } catch(e) { console.log('Could not auto-close'); }
            }, 10000);
          </script>
        </body>
      </html>
    `, {
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });
  }
  
  // Cancel page
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Cancelled</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container { 
            background: white; 
            padding: 40px; 
            border-radius: 20px; 
            max-width: 400px; 
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            animation: slideUp 0.5s ease-out;
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .cancel { color: #dc3545; font-size: 64px; margin-bottom: 20px; }
          h1 { color: #333; margin-bottom: 20px; font-size: 28px; }
          p { color: #666; margin-bottom: 30px; line-height: 1.6; }
          .button { 
            background: #6c757d; 
            color: white; 
            padding: 15px 30px; 
            border: none; 
            border-radius: 10px; 
            text-decoration: none; 
            display: inline-block; 
            font-weight: 600;
            transition: background 0.3s;
          }
          .button:hover { background: #545b62; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="cancel">❌</div>
          <h1>Payment Cancelled</h1>
          <p>Your payment was cancelled. No charges were made. You can close this window and try again later if you'd like to purchase credits.</p>
          <a href="#" onclick="window.close(); return false;" class="button">Close Window</a>
        </div>
        <script>
          // Auto-close after 8 seconds
          setTimeout(() => {
            try { window.close(); } catch(e) { console.log('Could not auto-close'); }
          }, 8000);
        </script>
      </body>
    </html>
  `, {
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  });
});