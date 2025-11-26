// 2. 設定您的金鑰和 URL (請替換為您的實際值)
    const SUPABASE_URL = 'https://fpknobaqsycfvcftcqgq.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_9aL5kTXzgwyIlG9sXX_O5Q_q8shoFmZ';

    // 3. 初始化 Supabase Client
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 4. 定義非同步函式來獲取資料
    async function fetchTripData() {
        console.log('嘗試從 Supabase 讀取資料...');

        const targetTitle = '曼谷五日自由行 (11/27 - 12/1)';

    const { data, error } = await supabaseClient
        .from('T_Travel_Trips') // 選擇您建立的 trips 表格
        .select('json_data') // 只選擇儲存行程 JSON 的欄位
        .eq('title', targetTitle) // <--- 【⭐ 搜尋條件修改 ⭐】 根據 title 欄位精確搜尋
        .limit(1);

        if (error) {
            console.error('從 Supabase 讀取資料失敗:', error.message);
            // 可以在這裡顯示錯誤訊息給使用者
            return null;
        }

        if (data && data.length > 0) {
            console.log('資料讀取成功！');
            // 取得完整的行程物件
            const tripDataFromDB = data[0].json_data; 

            // a. 移除所有與「完成狀態」和「實際花費」相關的 Local Storage 紀錄
        // 這是為了確保新的行程數據不會繼承舊行程的狀態
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.endsWith(CHECK_KEY_SUFFIX) || key.endsWith(COST_KEY_SUFFIX))) {
                localStorage.removeItem(key);
            }
        }
            
            try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tripDataFromDB));
            
            // c. 顯示提示並刷新頁面
            showToast('✅ 已從雲端更新並載入最新行程！');
            console.log('Local Storage 已更新，準備刷新頁面...');
            
            // 延遲刷新，讓使用者看到 toast 提示
            setTimeout(() => {
                location.reload();
            }, 1200);

        } catch (e) {
            console.error('儲存或刷新頁面失敗:', e);
            showToast('❌ 雲端資料獲取成功，但儲存失敗。');
        }

        return tripDataFromDB;
        } else {
            console.log(`未找到標題為 "${targetTitle}" 的行程資料。`);
        showToast('ℹ️ 未找到最新雲端行程資料，使用本地數據。');
        return null;
        }
    }

    // 頁面載入後執行
   window.loadRemoteData = fetchTripData;
