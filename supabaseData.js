// ===============================================
// 1. 常數與初始化
// ===============================================

// 假設這些常數在其他地方定義 (例如 STORAGE_KEY, CHECK_KEY_SUFFIX, COST_KEY_SUFFIX, showToast)
// 為了這個範例，我們假設它們存在。
// const STORAGE_KEY = 'tripData'; 
// const CHECK_KEY_SUFFIX = '_checked';
// const COST_KEY_SUFFIX = '_cost';
// function showToast(message) { console.log(`[Toast] ${message}`); } 
// ❗ 為了讓程式碼能執行，請確保這些輔助常數和函式已在您的 HTML 或其他 JS 檔案中定義。

// 2. 設定您的金鑰和 URL (請替換為您的實際值)
const SUPABASE_URL = 'https://fpknobaqsycfvcftcqgq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9aL5kTXzgwyIlG9sXX_O5Q_q8shoFmZ';

// 3. 初始化 Supabase Client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 固定的目標行程標題，用於讀取和儲存
const targetTitle = '曼谷五日自由行 (11/27 - 12/1)';
const TARGET_TABLE = 'T_Travel_Trips'; 

// ===============================================
// 4. 讀取資料函式 (fetchTripData)
// 此函式在頁面載入時執行
// ===============================================

async function fetchTripData() {
    console.log('嘗試從 Supabase 讀取資料...');

    const { data, error } = await supabaseClient
        .from(TARGET_TABLE) 
        .select('json_data') 
        .eq('title', targetTitle) 
        .limit(1);

    if (error) {
        console.error('從 Supabase 讀取資料失敗:', error.message);
        showToast('❌ 雲端資料讀取失敗！');
        return null;
    }

    if (data && data.length > 0) {
        console.log('資料讀取成功！');
        const tripDataFromDB = data[0].json_data; 
        
        // a. 移除所有與「完成狀態」和「實際花費」相關的 Local Storage 紀錄 (如您原碼所示)
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.endsWith(CHECK_KEY_SUFFIX) || key.endsWith(COST_KEY_SUFFIX))) {
                localStorage.removeItem(key);
            }
        }
        
        try {
            // b. 將雲端資料儲存到 Local Storage
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

// ===============================================
// 5. 儲存資料函式 (saveTripData) <--- 新增部分
// 此函式在使用者按下儲存按鈕時執行
// ===============================================

/**
 * 將新的行程資料儲存/更新到 Supabase。
 * @param {object} newTripJson - 包含完整行程資料 (含 title, days 等) 的 JSON 物件。
 * @returns {Promise<boolean>} - 儲存成功或失敗。
 */
async function saveTripData(newTripJson) {
    if (!newTripJson || !newTripJson.title) {
        console.error('無法儲存：新的行程資料物件無效。');
        showToast('❌ 儲存失敗：資料格式錯誤。');
        return false;
    }

    console.log(`嘗試將資料儲存到 Supabase (Title: ${newTripJson.title})...`);
    
    // 確保只儲存必要的欄位，並使用 targetTitle 進行衝突檢查
    const dataToUpsert = {
        title: newTripJson.title,
        // 假設 start_date/end_date 可以從 days[0] 和 days[last] 取得，
        // 這裡為簡化，先使用預設值或從 newTripJson 結構中提取。
        // 如果您的應用程式只處理單一 title，可以手動設定。
        start_date: newTripJson.days && newTripJson.days.length > 0 ? newTripJson.days[0].fullDate : null,
        end_date: newTripJson.days && newTripJson.days.length > 0 ? newTripJson.days[newTripJson.days.length - 1].fullDate : null,
        json_data: newTripJson, // 儲存整個行程物件
    };

console.log(dataToUpsert);
    
    // 使用 upsert，如果 title 存在，則更新，舊資料會被 Trigger 移到 Log 表。
    const { data, error } = await supabaseClient
        .from(TARGET_TABLE)
        .upsert(dataToUpsert, { 
            onConflict: 'title', // 根據 title 欄位判斷是否為衝突/更新
            ignoreDuplicates: false // 確保執行更新或插入
        });

    if (error) {
        console.error('儲存至 Supabase 失敗:', error.message);
        showToast(`❌ 雲端儲存失敗: ${error.message}`);
        return false;
    }

    console.log('✅ 資料已成功儲存/更新至 Supabase。舊資料已自動備份到 Log 表。');
    showToast('💾 行程已成功儲存到雲端！');
    return true;
}

// 頁面載入後執行
window.loadRemoteData = fetchTripData;
window.saveRemoteData = saveTripData; // 暴露給 HTML 呼叫
