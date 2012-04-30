#pragma strict
#pragma downcast

import CustomWidgets;

var colorCircle : Texture2D;
var previewItemPos : Transform;
var textStyle : GUIStyle;
var emitter : Emitter;
var unitQueueButtonStyle : GUIStyle;
var selectedUnitIndex : int;
var unitAttributes : UnitAttributes;

static var panelWidth : int = 200;
static var panelHeight = Screen.height;
//private var previewItem : GameObject;
private var costValue : int = 0;
private var timeValue : float = 0;
private var recalcCosts : boolean = false;
private var unitTypeStrings : String[] = ["1", "2", "3", "4", "5"];
private var unitQueueScrollPosition : Vector2;


function Awake()
{
   panelWidth = Screen.width*0.20;
   unitAttributes = null;
}

function SetNew(newEmitter : Emitter)
{
   enabled = true;
   emitter = newEmitter;
   selectedUnitIndex = 0;
   if (emitter.unitQueue.Count > 0)
      unitAttributes = emitter.unitQueue[selectedUnitIndex];
   else
      unitAttributes = null;
   recalcCosts = true;
}

function SetSelectedUnitIndex(index : int)
{
   if (emitter.unitQueue.Count <= 0 || index < 0 || index >= emitter.unitQueue.Count)
      return;
   selectedUnitIndex = index;
   unitAttributes = emitter.unitQueue[selectedUnitIndex];
   recalcCosts = true;
}

function OnGUI()
{
   if (emitter == null)
   {
      selectedUnitIndex = -1;
      return;
   }

   panelWidth = Screen.width*0.20;
   panelHeight = Screen.height;// *0.90;
   var previewHeight = Screen.height-panelHeight;

   if (recalcCosts)
   {
      //costValue = unit.GetCurrentCost();
      //costValue += unit.GetColorDeltaCost(tower.color, Color.white);
      //timeValue = unit.GetCurrentTimeCost();
      //timeValue += unit.GetColorDeltaTimeCost(tower.color, Color.white);
      emitter.UpdatePreviewUnit(unitAttributes, selectedUnitIndex);
      recalcCosts = false;
   }

   // 3D Camera
   //GUIControl.previewCamera.camera.pixelRect = Rect(0, panelHeight, panelWidth, previewHeight);

   var panelRect : Rect = Rect(0, previewHeight, panelWidth, panelHeight);

   GUI.Box(panelRect,"");

   GUILayout.BeginArea(panelRect);

      GUILayout.BeginVertical();

         if (unitAttributes != null)
         {
            // Unit Type Button grid
            var newUnitTypeButton : int = GUILayout.SelectionGrid(unitAttributes.unitType, unitTypeStrings, 5, GUILayout.MinHeight(25));
            if (newUnitTypeButton != unitAttributes.unitType)
            {
               unitAttributes.unitType = newUnitTypeButton;
               recalcCosts = true;
            }
            GUILayout.Space(5);
   
            // Size slider
            GUILayout.BeginHorizontal();
               GUILayout.Label("Size", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
               GUILayout.Space(5);
               var newlySelectedSize : float = GUILayout.HorizontalSlider(unitAttributes.size, 0.0, 1.0, GUILayout.ExpandWidth(true));
               GUILayout.Space(5);
               if (newlySelectedSize != unitAttributes.size)
               {
                  unitAttributes.size = newlySelectedSize;
                  recalcCosts = true;
               }
            GUILayout.EndHorizontal();

            // Strength slider
            GUILayout.BeginHorizontal();
               GUILayout.Label("Str", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
               GUILayout.Space(5);
               var newlySelectedStrength : float = GUILayout.HorizontalSlider(unitAttributes.strength, 0.0, 1.0, GUILayout.ExpandWidth(true));
               GUILayout.Space(5);
               if (newlySelectedStrength != unitAttributes.strength)
               {
                  unitAttributes.strength = newlySelectedStrength;
                  recalcCosts = true;
               }
            GUILayout.EndHorizontal();

            // Color Wheel
            var newlySelectedColor : Color = RGBCircle(unitAttributes.color, "", colorCircle);
            if (newlySelectedColor != unitAttributes.size)
            {
               unitAttributes.color = newlySelectedColor;
               recalcCosts = true;
            }

            //// Unit queue label
            //textStyle.normal.textColor = Color.white;
            //GUILayout.Label(GUIContent("Unit Queue", "QueueLabel"), textStyle);
         }

         //GUILayout.FlexibleSpace(); // push everything down

         var temp : UnitAttributes = null;

         // Queue manipulators
         GUILayout.BeginHorizontal();
            // Add unit button
            var ua : UnitAttributes;
            if (GUILayout.Button(GUIContent("Add", "AddToQueue")))
            {
               ua = new UnitAttributes();
               emitter.unitQueue.Add(ua);
               SetSelectedUnitIndex(emitter.unitQueue.Count-1);
               emitter.SpawnPreviewUnit(unitAttributes, selectedUnitIndex);
            }
            // Ins unit button
            if (emitter.unitQueue.Count > 0 && GUILayout.Button(GUIContent("Ins", "InsertInQueue")))
            {
               ua = new UnitAttributes();
               emitter.unitQueue.Insert(selectedUnitIndex, ua);
               SetSelectedUnitIndex(selectedUnitIndex);
               emitter.ResyncPreviewUnits();
            }
            // Remove unit button
            if (emitter.unitQueue.Count > 0 && GUILayout.Button(GUIContent("Del", "DeleteFromQueue")))
            {
               // Only delete if we have queue contents
               if (emitter.unitQueue.Count > 0)
                  emitter.unitQueue.RemoveAt(selectedUnitIndex);
               // If queue is empty, remove unit controls
               if (emitter.unitQueue.Count == 0)
                  unitAttributes = null;
               // If we deleted the last unit, reselect new last unit
               if (selectedUnitIndex > emitter.unitQueue.Count-1)
                  SetSelectedUnitIndex(selectedUnitIndex);
               emitter.ResyncPreviewUnits();
            }
         GUILayout.EndHorizontal();

         GUILayout.BeginHorizontal();
            // Move unit forward button
            if (emitter.unitQueue.Count > 0 && GUILayout.Button(GUIContent("<", "Forward")))
            {
               if (selectedUnitIndex > 0)
               {
                  temp = emitter.unitQueue[selectedUnitIndex];
                  emitter.unitQueue.RemoveAt(selectedUnitIndex);
                  selectedUnitIndex -= 1;
                  emitter.unitQueue.Insert(selectedUnitIndex, temp);
                  emitter.ResyncPreviewUnits();
               }
            }
            // Move unit backward button
            if (emitter.unitQueue.Count > 0 && GUILayout.Button(GUIContent(">", "Backward")))
            {
               if (selectedUnitIndex < (emitter.unitQueue.Count-1))
               {
                  temp = emitter.unitQueue[selectedUnitIndex];
                  emitter.unitQueue.RemoveAt(selectedUnitIndex);
                  selectedUnitIndex += 1;
                  emitter.unitQueue.Insert(selectedUnitIndex, temp);
                  emitter.ResyncPreviewUnits();
               }
            }
         GUILayout.EndHorizontal();
         //GUILayout.FlexibleSpace(); // push everything down

         // Unit queue
         unitQueueScrollPosition = GUILayout.BeginScrollView(unitQueueScrollPosition);
            var invCols : int = panelWidth/55;
            var colCount : int = 0;
            var unitCount : int = 0;
            GUILayout.FlexibleSpace(); // push everything down
   
            GUILayout.BeginHorizontal();

               // Loop through all squads and draw buttons for each
               for (var unitAttr in emitter.unitQueue)
               {
                  var isUnitSelected : boolean = (selectedUnitIndex == unitCount);

                  // Draw button, check if new squad was selected
                  GUI.color = unitAttr.color;
                  if (isUnitSelected)
                     GUI.color.a = GUIControl.colorPulsateValue;

                  var newIsUnitSelected : boolean = GUILayout.Toggle(isUnitSelected, unitAttr.unitType.ToString(), unitQueueButtonStyle, GUILayout.Width(50), GUILayout.Height(50));
                  if (newIsUnitSelected != isUnitSelected)
                  {
                     selectedUnitIndex = unitCount;
                     unitAttributes = unitAttr;
                  }

                  // Return tint to white
                  GUI.color = Color.white;
                  GUI.color.a = 1.0;
      
                  // Check if we need to start a new row of buttons
                  colCount++;
                  if (colCount >= invCols)
                  {
                     colCount = 0;
                     GUILayout.EndHorizontal();
                     GUILayout.Space(5);
                     GUILayout.BeginHorizontal();
                  }

                  unitCount++;
               }
               if (colCount < invCols)
                  GUILayout.EndHorizontal();
         GUILayout.EndScrollView();

         if (emitter.unitQueue.Count > 0)
         {
            GUILayout.Space(10);

            // Speed slider
            GUILayout.BeginHorizontal();
               GUILayout.Label("Spd", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
               GUILayout.Space(5);
               var newlySelectedLaunchSpeed : float = GUILayout.HorizontalSlider(emitter.launchSpeed, 1.0, 5.0, GUILayout.ExpandWidth(true));
               GUILayout.Space(5);
               //Debug.Log("newlySelectedLaunchSpeed="+newlySelectedLaunchSpeed+" emitter.launchSpeed="+emitter.launchSpeed);
               if (newlySelectedLaunchSpeed != emitter.launchSpeed)
                  emitter.launchSpeed = newlySelectedLaunchSpeed;
            GUILayout.EndHorizontal();

            // Cost
            textStyle.normal.textColor = ((-costValue) > GameData.player.credits) ? Color.red : Color(0.2,1.0,0.2);
            textStyle.fontSize = 30;
            GUILayout.Label(GUIContent((costValue<0 ? (-costValue).ToString() : "+"+costValue.ToString()), "Cost"), textStyle);

            // Time
            textStyle.normal.textColor = Color.white;
            textStyle.fontSize = 20;
            GUILayout.Label(GUIContent(timeValue.ToString("#.0")+"sec", "Time"), textStyle);

            if (GUILayout.Button(GUIContent("Launch", "LaunchButton")))
            {
               emitter.Launch(emitter.launchSpeed);
            }
         }

      GUILayout.EndVertical();
   GUILayout.EndArea();
}

/*
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
   DestroyPreviewItem();

   if (type>0)
   {
      var prefabName : String = Unit.PrefabName(type);
      previewItem = Instantiate(Resources.Load(prefabName, GameObject), previewItemPos.position, Quaternion.identity);
      previewItem.GetComponent(Unit).enabled = false;
      previewItem.layer = 8; // 3D GUI layer
      previewItem.tag = "";
      previewItem.name = "AttackGUIPreviewItem";
      //var pScr : AttackGUIPreviewItem = previewItem.AddComponent(AttackGUIPreviewItem);
      //pScr.squad = squad;
   }
}
*/
