function murata_cut(type){
   var murata_cut = "";
   var spiritdb = new SharedDatabase('mtl_spirit_ls');
   var link_WLS = "SCHM_EUC_MTL";
   //var spiritdb = new SharedDatabase('mtl_spirit_with_ls');

    var chkslash = type.indexOf("/");
    var type_cut = "";
    var puss_cut = "";
    if(chkslash < 0){
      murata_cut = type ;
    }else{
      var sql  = "select * from "+link_WLS+".pv1006 where trim(kb32500) = '"+type+"'";
      var result =  spiritdb.execute(sql);
      if(result.countRow > 0){
        murata_cut = type ;
      }else{
        type_cut = type.substring(0,chkslash);
        var chkPuss = type.indexOf("+");
        if(chkPuss < 0){
          murata_cut = type_cut;
        }else{
          puss_cut = type_cut.substring(0,chkPuss);
          murata_cut = puss_cut;
        }
      }
    }
    return murata_cut;
}
function clear_data(invoice){
  var db = new TenantDatabase();
  var clear_0004 = "delete from imfr_ut_mtlgls0004 where imfr_ud_inv_no = '"+invoice+"'";
  var result_del =  db.execute(clear_0004);
 
}
function run(input) {
    
    var inv_tran = input.inv_tran;
    var userid = input.userid;

    var message = "";

    var PKG_CD = "";
    var insp_seq = "";
    var insp_no = "";
    var pkg_id = "";
    var type = "";

    var PKG_WEIGHT_T = "";
    var number = 0;
    var temp = "";
    var tempp = "";

    var temp_type = "";
    var pkg_w = "";
    var chk_inv = "";

    var facverdb = new TenantDatabase();
    var database = new SharedDatabase('mtl_logistic_t');
    var spiritdb = new SharedDatabase('spirits_mtl_prd');
    //var spiritdb = new SharedDatabase('mtl_spirit_with_ls');
    ///////////////////////////////////////////////////////////////////////////////////////////
    var inv_sprit = inv_tran.split(",");
    for(var j = 0 ; j < inv_sprit.length ; j ++ ){ 
        if(inv_sprit[j] !== chk_inv){ ///ถ้ามีการเปลี่ยน invoice ใหม่
          tempp = "";
          number = 0 ;
          chk_inv = inv_sprit[j];
        }
      clear_data(inv_sprit[j]);
       // var sql_truck = "select IMFR_UD_MURATA_TYPE as type , IMFR_UD_INSP_SEQ as insp_seq,IMFR_UD_INSP_NO as insp_no, IMFR_SD_PKG_ID as pkg_id from IMFR_UT_MTLLSL001 WHERE IMFR_UD_INV_TRAN = '" + inv_sprit[j] + "'  ORDER BY IMFR_SD_PKG_ID,IMFR_UD_MURATA_TYPE, IMFR_UD_PKG_SEQ";
       var sql_truck   = " select distinct type ,insp_no, pkg_id from  "+   
             " ( " +
             " select  imfr_ud_murata_type as type , IMFR_UD_INSP_NO as insp_no, imfr_sd_pkg_id as pkg_id from imfr_ut_mtllsl001 where imfr_ud_inv_tran = '" + inv_sprit[j] + "'    " + 
             " order by imfr_sd_pkg_id,imfr_ud_murata_type, imfr_ud_pkg_seq  ) order by pkg_id,type ";
              
        var result_truck = facverdb.execute(sql_truck);
        if (result_truck.error) {
            message = "Error ";
        } else {
    
            for (var i = 0; i < result_truck.countRow; i++) {
    
                insp_no = result_truck.data[i].insp_no;
                //insp_seq = result_truck.data[i].insp_seq;
                pkg_id = result_truck.data[i].pkg_id;
                type = result_truck.data[i].type;
                 
                 
                // PKG_WEIGHT_T = cal_bulk(type);
                if (type !== temp_type) {
                    PKG_WEIGHT_T = cal_bulk(type, inv_sprit[j]);
                    if (PKG_WEIGHT_T[0] === 0) {
                        message = "INVOICE No. " + inv_sprit[j].toString() +": HAVE NOT PACKAGE WEIGHT " + PKG_WEIGHT_T[1].toString()  + " | TYPE >> " + type + " กรุณาติดต่อ B20 เพื่อ Register";
                    } else if (PKG_WEIGHT_T[0] === -1) {
                        message = "INVOICE No. " + inv_sprit[j].toString() +": HAVE NOT BOX TYPE" + PKG_WEIGHT_T[1].toString() + " กรุณาติดต่อโรงงานเพื่อ Register";
                    } else if (PKG_WEIGHT_T[0] === -2) {
                        message = "INVOICE No. " + inv_sprit[j].toString() +": HAVE NOT PKG BULK"+ PKG_WEIGHT_T[1].toString() + " กรุณาตรวจสอบ";
                    } else if (PKG_WEIGHT_T[0] === -3) {
                        message = "INVOICE No. " + inv_sprit[j].toString() +": HAVE NOT FACTORY CODE AND PACKING CODE" + PKG_WEIGHT_T[1].toString() + " กรุณาตรวจสอบ";
    
                    } else {
                        PKG_WEIGHT_T = PKG_WEIGHT_T[0];
                    }
                    temp_type = type;
                }
    
                if (message === "") {
                    if (pkg_id !== tempp) {
                       // Debug.console("seerii PKG: " + pkg_id + " i :" + i);
                        number += 1;
                        insert_header_invtran(pkg_id, number, userid, inv_sprit[j]);
                    }
    
                    pkg_w = PKG_WEIGHT_T;
                    tempp = pkg_id;
                    // Debug.console("MTL913422_CHECK_INSP");
                    // Debug.console(insp_no);
                    // Debug.console(insp_seq);
                    
                    insert_detail_invtran(pkg_w, insp_no, number, userid,inv_sprit[j],pkg_id);
                }
    
            }
            //cal_bulk(DE2E3KY102MN2AM01F/A1,B52,P778)
        }

    }
    //new TenantDatabase().execute("COMMIT",[]);
 
    return {
        message: message
    };
}

function insert_detail_invtran(weight_t, insp_no, number, userid,inv_tran,pkg_id) {
    var FAC_CD = "";
    var FAC_CD_B = "";
    var MTL_TYPE = "";
    var CUST_CD = "";
    var INSP_NO = "";
    var STD_QTY_PKG = "";
    var PKG_ID = "";
    var PRICE = "";
    var PKG_SEQ = "";
    var BOX_ID = "";
    var INV_TRAN = "";
    var LOT_NO = "";
    var NET_WT = "";
    var QTY = "";
    var OUTER_QTY = "";
    var CREATED_DATE = "";
    var USER = "";
    var MODIFIED_DATE_TIME = "";
    var MODIFIER_USER = "";
    var BOX_ID_SEQNO = "";
    var SEQ_NO = "";
    var INSP_GUA = "";
    var INSP_GUA_CD = "";
    var INSP_SEQ = "";
    var WEIGHT_PALLET = "";
    var TRUCK_NO = "";

    var PKG_WIDTH = "";
    var PKG_LENGTH = "";
    var PKG_HEIGHT = "";
    var PKG_WEIGHT = "";
    var PKG_PRICE = "";
    var IMFR_UD_TARIFF_DES = "";
    var inv_seq = "";
    
    var tariff_cd = "";
    var type_cutt = "";

    var facverdb = new TenantDatabase();
    //var database = new SharedDatabase('mtl_logistic');
    //var spiritdb = new SharedDatabase('mtl_spirit_with_ls');
    //var spiritdb = new SharedDatabase('spirits_mtl_prd');

    var message = "";

    // var sql_facver = "SELECT 	IMFR_UD_FATY_CD AS fac_cd, IMFR_UD_MURATA_TYPE AS mtl_type, IMFR_UD_CUSTPS AS custps, IMFR_UD_INSP_NO AS insp_no, IMFR_UD_INSP_SEQ AS insp_seq ," +
    //     "IMFR_SD_PKG_ID as pkg_id, IMFR_UD_PRICE AS price, IMFR_UD_LOT_NO AS lot_no, IMFR_UD_QTY AS QTY,  IMFR_UD_PKG_SEQ AS pkg_seq, IMFR_SD_BOX_ID AS box_id," +
    //     "IMFR_UD_NET_WT AS net_wt , IMFR_UD_INV_TRAN as inv_tran, IMFR_UD_TARIFF_DES as tariff, IMFR_UD_TARIFF_CD as tariff_cd " +
    //     "FROM IMFR_UT_MTLLSL001 WHERE IMFR_UD_INSP_NO = '" + insp_no + "' AND IMFR_UD_INSP_SEQ = '" + insp_seq + "' and IMFR_UD_INV_TRAN = '"+inv_tran+"' ";
 
 
 	var sql_facver = "  select 	imfr_ud_faty_cd as fac_cd, imfr_ud_murata_type as mtl_type, imfr_ud_custps as custps, imfr_ud_insp_no as insp_no, '' as insp_seq ,  "+
    " imfr_sd_pkg_id as pkg_id, imfr_ud_price as price, imfr_ud_lot_no as lot_no, sum(imfr_ud_qty) as qty,  '' as pkg_seq, '' as box_id,            "+
    " IMFR_UD_NET_WT AS net_wt , IMFR_UD_INV_TRAN as inv_tran, IMFR_UD_TARIFF_DES as tariff, IMFR_UD_TARIFF_CD as tariff_cd                    "+
    " from imfr_ut_mtllsl001 where imfr_ud_inv_tran = '"+inv_tran+"'   and     IMFR_UD_INSP_NO = '"+insp_no+"'  and   imfr_sd_pkg_id = '"+pkg_id+"' "+
    " group by imfr_ud_faty_cd , imfr_ud_murata_type , imfr_ud_custps , imfr_ud_insp_no ,  imfr_sd_pkg_id , imfr_ud_lot_no                          "+
    " , imfr_ud_tariff_des, imfr_ud_tariff_cd  ,imfr_ud_price,IMFR_UD_INV_TRAN ,IMFR_UD_NET_WT "
 
    
    var result_facver_data = facverdb.execute(sql_facver);
    if (result_facver_data.error) {
        message = "connect facver : " + result_facver_data.toString();
    } else {
        if (result_facver_data.countRow > 0) {
          for(var z =0 ; z < result_facver_data.countRow ; z++){
            FAC_CD = result_facver_data.data[z].fac_cd; ////////////
            MTL_TYPE = result_facver_data.data[z].mtl_type;
            CUST_CD = result_facver_data.data[z].custps;
            INSP_NO = result_facver_data.data[z].insp_no;
            INSP_SEQ = result_facver_data.data[z].insp_seq;
            PKG_ID = result_facver_data.data[z].pkg_id;
            PRICE = result_facver_data.data[z].price;
            PKG_SEQ = result_facver_data.data[z].pkg_seq;
            BOX_ID = result_facver_data.data[z].box_id;
            INV_TRAN = result_facver_data.data[z].inv_tran;
            LOT_NO = result_facver_data.data[z].lot_no;
            NET_WT = result_facver_data.data[z].net_wt;
            QTY = result_facver_data.data[z].qty;
            IMFR_UD_TARIFF_DES = result_facver_data.data[z].tariff;
            tariff_cd  = result_facver_data.data[z].tariff_cd;

            var str_num = number.toString();

            if (str_num.length == 1) {
                inv_seq = '00' + str_num;
            }
            if (str_num.length == 2) {
                inv_seq = '0' + str_num;
            }
            if (str_num.length >= 3) {
                inv_seq = str_num;
            }
            
            type_cutt = murata_cut(MTL_TYPE);
            
            var sql_insert = "INSERT INTO IMFR_UT_MTLGLS0004(IMFR_UD_FCTY	,IMFR_UD_INSP_NO	,IMFR_UD_INSP_SEQ	,IMFR_UD_CUSTPS	,IMFR_UD_MURATA_TYPE	,IMFR_UD_PKG_ID	,IMFR_UD_PRICE	," +
                "IMFR_UD_LOT_NO	,IMFR_UD_QTY	,IMFR_UD_BOX	,IMFR_UD_SENDER	,IMFR_UD_RCV	,IMFR_UD_INV_NO	,IMFR_UD_INV_SEQ	,IMFR_UD_TYPE	,IMFR_UD_NET_W	,IMFR_UD_BOX_W	,IMFR_UD_PALLET_W	,IMFR_UD_DIM	," +
                "IMFR_UD_USERID	,IMFR_UD_EDP_DATE	,IMFR_UD_PRT_STS	,IMFR_UD_IND	,IMFR_UD_BOXID	,IMFR_UD_INF_FLG	,IMFR_UD_TARIFF, IMFR_UD_TARIFF_CD, IMFR_UD_MURATA_TYPE_CUT) VALUES ('" + FAC_CD + "'	,'" + INSP_NO + "', '" + INSP_SEQ + "'	,'" + CUST_CD + "'," +
                "'" + MTL_TYPE + "'	,'" + PKG_ID + "'	,'" + PRICE + "'	,'" + LOT_NO + "'	,'" + QTY + "'	,'" + Number(PKG_SEQ) + "'	,''	,''	,'" + INV_TRAN + "'	,'" + inv_seq + "'	,'F' ," +
                "'" + NET_WT + "'	,'" + weight_t + "',''	,''	,'" + userid + "'	,SYSDATE	,''	,''	,'" + BOX_ID + "'	,''	,'" + IMFR_UD_TARIFF_DES + "' ,'" + tariff_cd + "' , '"+type_cutt+"')";
           
            var result_insert = facverdb.execute(sql_insert);
            // if( insp_no == "TF2616029"){
            //   Debug.console("MTL91342_CHECK_INSERT" + result_insert.toString());
            // }
           
            
            // if(result_insert.error){
            //   //Debug.console("MTL91342_CHECK_INSERT");
            //   message = "ERROR INSERT DETAIL" + result_insert.toString();
            // }
            // else{
            //   if(result_insert.countRow > 0){
            //     //message = "SUSCESS" ;
            //   }else{
            //         message = "FAIL" + result_insert.toString() ;
            //   }
            // }

            
          }
            

        }

    }
    //return message ;
}

function insert_header_invtran(pkg_id, number, userid,inv_tran) {

    var facverdb = new TenantDatabase();
    var database = new SharedDatabase('mtl_logistic');
    //var spiritdb = new SharedDatabase('spirits_mtl_prd');
    //var spiritdb = new SharedDatabase('mtl_spirit_with_ls');
    var message = "";
    var FAC_CD = "";
    var FAC_CD_B = "";
    var MTL_TYPE = "";
    var CUST_CD = "";
    var INSP_NO = "";
    var STD_QTY_PKG = "";
    var PKG_ID = "";
    var PRICE = "";
    var PKG_SEQ = "";
    var BOX_ID = "";
    var INV_TRAN = "";
    var LOT_NO = "";
    var NET_WT = "";
    var QTY = "";
    var OUTER_QTY = "";
    var CREATED_DATE = "";
    var USER = "";
    var MODIFIED_DATE_TIME = "";
    var MODIFIER_USER = "";
    var BOX_ID_SEQNO = "";
    var SEQ_NO = "";
    var INSP_GUA = "";
    var INSP_GUA_CD = "";
    var INSP_SEQ = "";
    var WEIGHT_PALLET = "";
    var TRUCK_NO = "";
    var PKG_WEIGHT_T = "";
    var PKG_WIDTH = "";
    var PKG_LENGTH = "";
    var PKG_HEIGHT = "";
    var PKG_WEIGHT = "";
    var PKG_PRICE = "";
    var IMFR_UD_TARIFF_DES = "";
    var inv_seq = "";

    var sql_facver = "SELECT 	IMFR_UD_FATY_CD AS fac_cd, IMFR_UD_MURATA_TYPE AS mtl_type, IMFR_UD_CUSTPS AS custps, IMFR_UD_INSP_NO AS insp_no, IMFR_UD_INSP_SEQ AS insp_seq ," +
        "IMFR_SD_PKG_ID as pkg_id, IMFR_UD_PRICE AS price, IMFR_UD_LOT_NO AS lot_no, IMFR_UD_QTY AS QTY,  IMFR_UD_PKG_SEQ AS pkg_seq, IMFR_SD_BOX_ID AS box_id," +
        "IMFR_UD_NET_WT AS net_wt, IMFR_UD_INV_TRAN as inv " +
        "FROM IMFR_UT_MTLLSL001 WHERE IMFR_SD_PKG_ID = '" + pkg_id + "' and IMFR_UD_INV_TRAN = '"+inv_tran+"' ";

    var result_facver_data = facverdb.execute(sql_facver);
    if (result_facver_data.error) {
        message = "connect facver : " + result_box_data.toString();
    } else {
        if (result_facver_data.countRow > 0) {
            FAC_CD = result_facver_data.data[0].fac_cd; ////////////
            MTL_TYPE = result_facver_data.data[0].mtl_type;
            CUST_CD = result_facver_data.data[0].custps;
            INSP_NO = result_facver_data.data[0].insp_no;
            INSP_SEQ = result_facver_data.data[0].insp_seq;
            PKG_ID = result_facver_data.data[0].pkg_id;
            PRICE = result_facver_data.data[0].price;
            PKG_SEQ = result_facver_data.data[0].pkg_seq;
            BOX_ID = result_facver_data.data[0].box_id;
            INV_TRAN = result_facver_data.data[0].inv;
            LOT_NO = result_facver_data.data[0].lot_no;
            NET_WT = result_facver_data.data[0].net_wt;

            QTY = result_facver_data.data[0].qty;
            //message = "PKG_WEIGHT_T_2 " +  PKG_ID.toString()
            var sql_get_weight = "SELECT IMFR_UD_PKG_PRICE AS pkg_price, IMFR_UD_PKG_WIDTH as pkg_width, IMFR_UD_PKG_LENGTH as pkg_length, IMFR_UD_PKG_HEIGHT as pkg_height, IMFR_UD_PKG_WEIGHT as pkg_weight FROM IMFR_UT_MTLLSL004  WHERE IMFR_SD_PKG_ID = '" + PKG_ID + "'";
            var result_get_weight = facverdb.execute(sql_get_weight);
            if (result_get_weight.countRow > 0) {
                PKG_WIDTH = result_get_weight.data[0].pkg_width;
                PKG_LENGTH = result_get_weight.data[0].pkg_length;
                PKG_HEIGHT = result_get_weight.data[0].pkg_height;
                PKG_WEIGHT = result_get_weight.data[0].pkg_weight;
                PKG_PRICE = result_get_weight.data[0].pkg_price;

            }

            var str_num = number.toString();

            if (str_num.length == 1) {
                inv_seq = '00' + str_num;
            }
            if (str_num.length == 2) {
                inv_seq = '0' + str_num;
            }
            if (str_num.length >= 3) {
                inv_seq = str_num;
            }

            var sql_insert = "INSERT INTO IMFR_UT_MTLGLS0004(IMFR_UD_FCTY	,IMFR_UD_INSP_NO	,IMFR_UD_INSP_SEQ	,IMFR_UD_CUSTPS	,IMFR_UD_MURATA_TYPE	,IMFR_UD_PKG_ID	,IMFR_UD_PRICE," +
                "IMFR_UD_LOT_NO	,IMFR_UD_QTY	,IMFR_UD_BOX	,IMFR_UD_SENDER	,IMFR_UD_RCV	,IMFR_UD_INV_NO	,IMFR_UD_INV_SEQ	,IMFR_UD_TYPE	,IMFR_UD_NET_W	,IMFR_UD_BOX_W	,IMFR_UD_PALLET_W	,IMFR_UD_DIM	," +
                "IMFR_UD_USERID	,IMFR_UD_EDP_DATE	,IMFR_UD_PRT_STS	,IMFR_UD_IND	,IMFR_UD_BOXID	,IMFR_UD_INF_FLG	,IMFR_UD_TARIFF) VALUES ('" + FAC_CD + "'	,'-', ''	,'" + CUST_CD + "'," +
                "'" + PKG_ID + "'	,'CART'	,'" + PKG_PRICE + "'	,''	,'1'	,'0' ,''	,''	,'" + INV_TRAN + "'	,'" + inv_seq + "'	,'F' ," +
                " '" + PKG_WEIGHT + "'	,'" + PKG_WEIGHT + "','" + PKG_WEIGHT + "'	,'" + Number(PKG_WIDTH).toFixed(2) + "x" + Number(PKG_LENGTH).toFixed(2) + "x" + Number(PKG_HEIGHT).toFixed(2) + "'	,'" + userid + "'	,SYSDATE	,''	,''	,''	,''	,'' )";
            var result_insert = facverdb.execute(sql_insert);

            // if(result_insert.error){
            //   message = "head error" + result_insert.toString() ;
            // }
            //else{
            //   if(result_insert.countRow > 0){
            //     message = "SUCCESS" ;
            //     }else{
            //         message = "FAIL";
            //     }
            // }

        }

    }
    return message;

}

function chk_data_blank(val) {
    if (val === "" || val === 0 || val === null || val === " ") {
        return true;
    }
}

function cal_bulk(mtl_type, inv) {
    var facverdb = new TenantDatabase();
    var database = new SharedDatabase('mtl_logistic');
    var spiritdb = new SharedDatabase('mtl_spirit_ls');
    var link_WLS = "SCHM_EUC_MTL" ;
    //var spiritdb = new SharedDatabase('mtl_spirit_with_ls');
    var box1 = "";
    var box2 = "";
    var box3 = "";
    var box4 = "";
    var box5 = "";
    var box6 = "";
    var box7 = "";
    var box8 = "";
    var box9 = "";
    var box10 = "";
    var PKG_BLUK = "";
    var PKG_WEIGHT_T = "";
    var sql_box_type = "";
    var fac_cd_b = "";
    var pkg_cd = "";
    var box_type_data = "";
    var i = 0;
    var result_box_type = "";
    var message = "";

    var join_pkg_cd = "select IMFR_UD_PKG_CD as pkg_cd, IMFR_UD_FAC_CD as fac_cd FROM IMFR_UT_MTLLS000 WHERE IMFR_UD_MURATATYPE  = '" + mtl_type + "' AND ROWNUM =1";

   
    var result_join_pkg_cd = facverdb.execute(join_pkg_cd);

    if (result_join_pkg_cd.countRow > 0) {
        pkg_cd = result_join_pkg_cd.data[0].pkg_cd;
        fac_cd_b = result_join_pkg_cd.data[0].fac_cd;

    } else {
        PKG_WEIGHT_T = -3
        message = "TYPE : " + box_type_data + " FACTORY :" + fac_cd_b
    }

    var sql_bluk = "select IMFR_UD_BULK_TAPE as bulk_tape from IMFR_UT_MTLLSL001 WHERE IMFR_UD_MURATA_TYPE = '" + mtl_type + "' and imfr_ud_inv_tran = '"+inv+"'  ";
    var result_sql_bluck = facverdb.execute(sql_bluk);
   // Debug.console("91342_003");
    //Debug.console(result_sql_bluck);
    if (result_sql_bluck.error) {
        message = "ERROR CONNECTION CHECK BULK_TAPE";
    } else {
        if (result_sql_bluck.countRow > 0) {
            PKG_BLUK = result_sql_bluck.data[0].bulk_tape;
            //message = "result: " + PKG_BLUK.toString();
            if (pkg_cd === null || pkg_cd === "") {
                sql_box_type = "select BOX_TYPE1 as box1, BOX_TYPE2 as box2, BOX_TYPE3 as box3, BOX_TYPE4 as box4, BOX_TYPE5 as box5, BOX_TYPE6 as box6, BOX_TYPE7 as box7," +
                    "BOX_TYPE8 as box8, BOX_TYPE9 as box9 , BOX_TYPE10 as box10 from box_type WHERE BOX_MURATA_TYPE = '" + mtl_type + "'";
                result_box_type = database.execute(sql_box_type);
                // message = "is null";

            } else if (pkg_cd !== null || pkg_cd !== "") {
                sql_box_type = "SELECT CD11964_01 as box1 ,CD11964_02 as box2 , CD11964_03 as box3, CD11964_04 as box4, CD11964_05 as box5 , CD11964_06 as box6, CD11964_07 as box7 , CD11964_08 as box8, CD11964_09 as box9,CD11964_10 as box10 FROM "+link_WLS+".PV0008 PV0008 LEFT JOIN "+link_WLS+".SV9016 SV9016 ON SV9016.DH00037 = PV0008.DH00037" +
                    " WHERE SV9016.CD00188 = '" + pkg_cd + "' and PV0008.CD00163 = '" + mtl_type + "' and PV0008.CD00106 = '" + fac_cd_b + "'";

                result_box_type = spiritdb.execute(sql_box_type);
                //message = "not null";
            }

            //if(result_box_type.error){
            //  message = "connect error :" + result_box_type.toString();
            //}
            if (PKG_BLUK == "B") {

                if (result_box_type.countRow > 0) {
                    box1 = result_box_type.data[0].box1;
                    box2 = result_box_type.data[0].box2;
                    box3 = result_box_type.data[0].box3;
                    box4 = result_box_type.data[0].box4;
                    box5 = result_box_type.data[0].box5;
                    box6 = result_box_type.data[0].box6;
                    box7 = result_box_type.data[0].box7;
                    box8 = result_box_type.data[0].box8;
                    box9 = result_box_type.data[0].box9;
                    box10 = result_box_type.data[0].box10;
                    var arr_b = [box1, box2, box3, box4, box5, box6, box7, box8, box9, box10];
                    for (i = 0; i < arr_b.length; i++) {
                        var chk = chk_data_blank(arr_b[i]);
                        if (chk !== true) {
                            box_type_data = arr_b[i];
                            break;
                        }
                    }
                    var sql_chk_weight = "SELECT IMFR_UD_PKG_WEIGHT as weight from IMFR_UT_MTLLSL004 WHERE IMFR_SD_PKG_ID = '" + box_type_data + "'";
                    var result_chk_weight = facverdb.execute(sql_chk_weight);
               
                        if (result_chk_weight.countRow > 0) {
                          PKG_WEIGHT_T = result_chk_weight.data[0].weight;

                        } else {
                           
                          PKG_WEIGHT_T = 0;
                          message = "[mtllsl0004 IMDB] >> " + box_type_data + " | FACTORY >>" + fac_cd_b
                        }
                    
                  

                } else {
                    PKG_WEIGHT_T = -1;
                    message = "[Box_type LocalDB] >> " + mtl_type + " | FACTORY >>" + fac_cd_b
                    //message = "NOT HAVE BOX TYPE EIEI"
                }

            } else if (PKG_BLUK === "T") {
                if (result_box_type.countRow > 0) {
                    box1 = result_box_type.data[0].box1;
                    box2 = result_box_type.data[0].box2;
                    box3 = result_box_type.data[0].box3;
                    box4 = result_box_type.data[0].box4;
                    box5 = result_box_type.data[0].box5;
                    box6 = result_box_type.data[0].box6;
                    box7 = result_box_type.data[0].box7;
                    box8 = result_box_type.data[0].box8;
                    box9 = result_box_type.data[0].box9;
                    box10 = result_box_type.data[0].box10;

                    var arr_t = [box10, box9, box8, box7, box6, box5, box4, box3, box2, box1];
                    for (i = 0; i < arr_t.length; i++) {
                        var chk_t = chk_data_blank(arr_t[i]);
                        if (chk_t !== true) {
                            box_type_data = arr_t[i];
                            break;
                        }
                    }
                    var sql_chk_weight_T = "SELECT IMFR_UD_PKG_WEIGHT as weight from IMFR_UT_MTLLSL004 WHERE IMFR_SD_PKG_ID = '" + box_type_data + "'";
                    var result_chk_weight_T = facverdb.execute(sql_chk_weight_T);
                  
                    if (result_chk_weight_T.countRow > 0) {
                        PKG_WEIGHT_T = result_chk_weight_T.data[0].weight;
                        

                    } else {
                        PKG_WEIGHT_T = 0; //HAVE NOT PACKAGE WEIGHT
                        message = "[mtllsl0004 IMDB] >> " + box_type_data + " | FACTORY >> " + fac_cd_b 
                        
                    }
                } else {
                    PKG_WEIGHT_T = -1; // HAVE NOT BOX TYPE
                    message = "[Box_type LocalDB] >> " + mtl_type + " | FACTORY >>" + fac_cd_b
                }

            } else {
                PKG_WEIGHT_T = -2; //HAVE NOT PAG BULK
                message = "TYPE >> " + mtl_type + "| FACTORY >>" + fac_cd_b
            }

        }
    }
    //return PKG_WEIGHT_T ;
    return [PKG_WEIGHT_T,message];

}
