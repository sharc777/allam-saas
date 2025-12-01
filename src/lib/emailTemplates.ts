export const emailTemplates = {
  achievementUnlocked: (name: string, achievement: string) => `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px; }
          .achievement-box { background: #F9FAFB; border: 2px solid #8B5CF6; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; }
          .achievement-box h2 { color: #8B5CF6; margin: 10px 0 0 0; font-size: 24px; }
          .cta-button { display: inline-block; background: #8B5CF6; color: white !important; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 30px; }
          .footer { background: #F9FAFB; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 إنجاز جديد!</h1>
          </div>
          <div class="content">
            <p style="font-size: 18px; color: #374151; text-align: center;">مبروك <strong>${name}</strong>!</p>
            <p style="font-size: 16px; color: #6B7280; text-align: center;">لقد حققت إنجازاً رائعاً في رحلتك التعليمية</p>
            <div class="achievement-box">
              <div style="font-size: 48px;">🏆</div>
              <h2>${achievement}</h2>
            </div>
            <p style="text-align: center; color: #6B7280;">استمر في التقدم وحقق المزيد من النجاحات!</p>
            <div style="text-align: center;">
              <a href="https://yourdomain.com/dashboard" class="cta-button">عرض لوحة التحكم</a>
            </div>
          </div>
          <div class="footer">
            <p>دربني - منصة الاستعداد لاختبار القدرات</p>
            <p>لإلغاء الاشتراك في هذه الرسائل، قم بتحديث تفضيلات البريد الإلكتروني في حسابك</p>
          </div>
        </div>
      </body>
    </html>
  `,

  subscriptionExpiring: (name: string, daysLeft: number, renewUrl: string) => `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px; }
          .warning-box { background: #FEF3C7; border: 2px solid #F59E0B; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; }
          .cta-button { display: inline-block; background: #F59E0B; color: white !important; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 30px; }
          .footer { background: #F9FAFB; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ تذكير بانتهاء الاشتراك</h1>
          </div>
          <div class="content">
            <p style="font-size: 18px; color: #374151; text-align: center;">مرحباً <strong>${name}</strong></p>
            <div class="warning-box">
              <div style="font-size: 48px;">⏰</div>
              <h2 style="color: #D97706; margin: 10px 0;">اشتراكك سينتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}</h2>
              <p style="color: #92400E; margin: 10px 0;">لا تفقد الوصول إلى المحتوى التعليمي الحصري</p>
            </div>
            <p style="text-align: center; color: #6B7280;">جدد اشتراكك الآن لتستمر في الاستفادة من جميع الميزات</p>
            <div style="text-align: center;">
              <a href="${renewUrl}" class="cta-button">تجديد الاشتراك الآن</a>
            </div>
          </div>
          <div class="footer">
            <p>دربني - منصة الاستعداد لاختبار القدرات</p>
          </div>
        </div>
      </body>
    </html>
  `,

  supportTicketCreated: (name: string, ticketNumber: string, subject: string) => `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px; }
          .ticket-box { background: #EFF6FF; border: 2px solid #3B82F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .ticket-number { font-size: 24px; font-weight: bold; color: #3B82F6; margin: 10px 0; }
          .footer { background: #F9FAFB; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📨 تم إنشاء تذكرة دعم</h1>
          </div>
          <div class="content">
            <p style="font-size: 18px; color: #374151;">مرحباً <strong>${name}</strong></p>
            <p style="color: #6B7280;">تم استلام طلب الدعم الخاص بك بنجاح. سيقوم فريقنا بمراجعته والرد عليك في أقرب وقت.</p>
            <div class="ticket-box">
              <p style="margin: 5px 0; color: #6B7280;">رقم التذكرة:</p>
              <div class="ticket-number">${ticketNumber}</div>
              <p style="margin: 5px 0; color: #6B7280;">الموضوع:</p>
              <p style="margin: 5px 0; font-weight: bold;">${subject}</p>
            </div>
            <p style="color: #6B7280; font-size: 14px;">يمكنك متابعة حالة تذكرتك من خلال صفحة الدعم في حسابك</p>
          </div>
          <div class="footer">
            <p>دربني - منصة الاستعداد لاختبار القدرات</p>
            <p>فريق الدعم الفني</p>
          </div>
        </div>
      </body>
    </html>
  `,

  welcomeEmail: (name: string) => `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px; }
          .features-box { background: #F9FAFB; border: 2px solid #8B5CF6; padding: 25px; border-radius: 12px; margin: 25px 0; }
          .features-box ul { color: #374151; padding-right: 20px; margin: 10px 0; line-height: 1.8; }
          .cta-button { display: inline-block; background: #8B5CF6; color: white !important; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
          .footer { background: #F9FAFB; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 مرحباً بك في دربني!</h1>
          </div>
          <div class="content">
            <p style="font-size: 18px; color: #374151;">أهلاً <strong>${name}</strong>!</p>
            <p style="color: #6B7280; line-height: 1.6;">نحن سعداء بانضمامك إلى منصة دربني للاستعداد لاختبار القدرات. رحلتك التعليمية تبدأ الآن!</p>
            
            <div class="features-box">
              <p style="font-weight: bold; margin-bottom: 15px; color: #374151; font-size: 16px;">ما ستحصل عليه:</p>
              <ul>
                <li>📚 برنامج تدريبي مكثف لمدة 30 يوم</li>
                <li>🤖 مساعد ذكي AI للإجابة على أسئلتك</li>
                <li>📊 تتبع تقدمك وتحليل نقاط ضعفك</li>
                <li>🎯 اختبارات مخصصة بناءً على مستواك</li>
                <li>💪 تمارين يومية متنوعة وشاملة</li>
              </ul>
            </div>
            
            <p style="text-align: center; color: #6B7280; margin-top: 30px;">جاهز لبدء رحلة التميز؟</p>
            <div style="text-align: center;">
              <a href="${window.location.origin}/dashboard" class="cta-button">ابدأ رحلتك الآن</a>
            </div>
          </div>
          <div class="footer">
            <p style="font-weight: bold; color: #374151;">دربني - منصة الاستعداد لاختبار القدرات 🎓</p>
            <p style="margin-top: 10px;">إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذا البريد.</p>
          </div>
        </div>
      </body>
    </html>
  `,
};
