#pragma strict
#pragma downcast

import CustomWidgets;

var colorCircle : Texture2D;
var previewItemPos : Transform;
var textStyle : GUIStyle;

static var panelWidth : int = 200;
static var panelHeight = Screen.height;

private var previewItem : GameObject;
private var costValue : int = 0;
private var timeValue : float = 0;
private var modifingExisting : boolean = false;
//private var squadCountStrings : String[] = ["5-", "-", "+", "5+"];

function Awake()
{
   panelWidth = Screen.width*0.20;
}

function SetTower(newTower : Tower)
{
   enabled = true;
   modifingExisting = true;
   NewPreviewItem(1);
}

function SetNew(unitType : int)
{
   enabled = true;
   squad.Initialize();  // Set base attr here
   squad.unitType = unitType;
   modifingExisting = false;
   NewPreviewItem(squad.unitType);
}

function OnGUI()
{
   // 3D Camera
   GUIControl.previewCamera.camera.enabled = true;
   GUIControl.previewCamera.camera.pixelRect = Rect(0, panelHeight, panelWidth, previewHeight);

   var panelRect : Rect = Rect(0, previewHeight, panelWidth, panelHeight);
   GUI.Box(panelRect,"");

   GUILayout.BeginArea(panelRect);

      GUILayout.BeginVertical();

         GUILayout.Space(15);

         // Range slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Range", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space (5);
            var newlySelectedRange : float = GUILayout.HorizontalSlider(selectedRange, towerAttr.minRange, towerAttr.maxRange, GUILayout.ExpandWidth(true));
            GUILayout.Space (5);
            if (selectedRange != newlySelectedRange)
            {
               selectedRange = newlySelectedRange;
               recalcCosts = true;
               // Set cursor range, or set the selected towers temp range
               if (cursorTower)
                  cursorTower.SetRange(selectedRange);
               else
                  selTower.SetTempRange(selectedRange);
            }
         GUILayout.EndHorizontal();

         // FOV
         selectedFOV = towerAttr.defaultFOV;

         // Rate of fire slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Rate", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedRate : float = GUILayout.HorizontalSlider(selectedRate, towerAttr.minFireRate, towerAttr.maxFireRate, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedRate != newlySelectedRate)
            {
               selectedRate = newlySelectedRate;
               recalcCosts = true;
               if (cursorTower)
                  cursorTower.fireRate = selectedRate;
               else
                  selTower.SetTempRate(selectedRate);

            }
         GUILayout.EndHorizontal();

         // Damage slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Dmg", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedDamage : float = GUILayout.HorizontalSlider(selectedDamage, towerAttr.minDamage, towerAttr.maxDamage, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedDamage != newlySelectedDamage)
            {
               selectedDamage = newlySelectedDamage;
               recalcCosts = true;
               if (cursorTower)
                  cursorTower.damage = selectedDamage;
               else
                  selTower.SetTempDamage(selectedDamage);
            }
         GUILayout.EndHorizontal();

         // Behavior selection grid
         var newlySelectedBehavior : int = GUILayout.SelectionGrid(selectedBehavior, behaviourStrings, 3);
         if (newlySelectedBehavior != selectedBehavior)
         {
            // just send over wire?
            selectedBehavior = newlySelectedBehavior;
         }
   
         // Color Wheel
         var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
         if (newlySelectedColor != selectedColor)
         {
            selectedColor = newlySelectedColor;
            recalcCosts = true;
            // Set cursor range, or set the selected towers temp range
            if (cursorTower)
               cursorTower.SetColor(selectedColor);
            else
               selTower.SetTempColor(selectedColor);
         }

         GUILayout.FlexibleSpace(); // push everything down

         // Cost
         if (costValue != 0)
         {
            // Credits
            textStyle.normal.textColor = ((-costValue) > GameData.player.credits) ? Color.red : Color(0.2,1.0,0.2);
            textStyle.fontSize = 30;
            GUILayout.Label((costValue<0 ? (-costValue).ToString() : "+"+costValue.ToString()), textStyle);

            // Time
            textStyle.normal.textColor = Color.white;
            textStyle.fontSize = 20;
            GUILayout.Label(timeValue.ToString("#.0")+"sec", textStyle);
         }

         GUILayout.BeginHorizontal();
         // Actions
         if (GameData.player.selectedTower)
         {
            // Sell button
            if (GUILayout.Button(GUIContent("Sell", "SellButton")))
            {
               GameData.player.credits += selTower.GetCurrentCost();
               GameData.player.credits += selTower. GetColorDeltaCost(Color.white, selTower.color);
               if (GameData.hostType>0)
                  Network.Destroy(GameData.player.selectedTower);
               else
                  Destroy(GameData.player.selectedTower);
               GameData.player.selectedTower = null;
            }

            // Apply button
            if (GUILayout.Button(GUIContent("Apply", "ApplyButton")))
            {
               if (costValue != 0 && (-costValue) < GameData.player.credits && lastTooltip != "SellButton" && selTower.isConstructing==false)
               {
                  GameData.player.credits += costValue;
                  costValue = 0;
                  if (Network.isServer || (GameData.hostType==0))
                     selTower.Modify(
                        selectedRange, selectedFOV, selectedRate, selectedDamage,
                        selectedColor.r, selectedColor.g, selectedColor.b);
                  else
                     selTower.netView.RPC("Modify", RPCMode.Server,
                        selectedRange, selectedFOV, selectedRate, selectedDamage,
                        selectedColor.r, selectedColor.g, selectedColor.b);
               }
            }
         }
         GUILayout.EndHorizontal();

      GUILayout.EndVertical();
   GUILayout.EndArea();

}

function OnEnable()
{
   GUIControl.previewCamera.camera.enabled = true;
}

function OnDisable()
{
   GUIControl.previewCamera.camera.enabled = false;
   DestroyPreviewItem();
}

function DestroyPreviewItem()
{
   if (previewItem)
   {
      for (var child : Transform in previewItem.transform)
         Destroy(child.gameObject);
      Destroy(previewItem);
   }
}

function NewPreviewItem(type : int)
{
   //Debug.Log("NewPreviewItem: type="+type);
   DestroyPreviewItem();

   if (type>0)
   {
      var prefabName : String = TowerUtil.PrefabName(type);
      previewItem = Instantiate(Resources.Load(prefabName, GameObject), previewItemPos.position, Quaternion.identity);
      previewItem.name = "DefendGUIPreviewItem";
      previewItem.layer = 8; // 3D GUI layer
      for (var child : Transform in previewItem.transform)
         child.gameObject.layer = 8; // 3D GUI layer

      previewItem.GetComponent(Collider).enabled = false;   //remove collider
      Destroy(previewItem.GetComponent(Tower).AOE.gameObject); //remove AOE
      previewItem.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior

      previewItem.AddComponent(DefendGUIPreviewItem);

   }
}