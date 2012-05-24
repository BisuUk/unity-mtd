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
var attackGUI : AttackGUI;

static var panelWidth : int = 200;
static var panelHeight = Screen.height;
//private var previewItem : GameObject;
private var costValue : int = 0;
private var timeValue : float = 0;
private var recalcCosts : boolean = false;
private var unitTypeStrings : String[] = ["Point", "Heal", "Tank"];
private var valueStrings : String[] = ["1", "2", "3", "4", "5"];
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
   SetSelectedUnitIndex(0);
   recalcCosts = true;
   attackGUI.ResetAbility();
}

function SetSelectedUnitIndex(index : int)
{
   if (emitter == null || emitter.unitQueue.Count <= 0 || index < 0 || index >= emitter.unitQueue.Count)
   {
      unitAttributes = null;
      selectedUnitIndex = -1;
      return;
   }
   selectedUnitIndex = index;
   unitAttributes = emitter.unitQueue[selectedUnitIndex];
}

function OnGUI()
{
   if (emitter == null)
   {
      SetSelectedUnitIndex(-1);
      enabled = false;
      return;
   }

   var e : Event = Event.current;

   panelWidth = Screen.width*0.20;
   panelHeight = Screen.height;// *0.90;
   var previewHeight = Screen.height-panelHeight;

   if (recalcCosts)
   {
      emitter.SetAttributesForIndex(unitAttributes, selectedUnitIndex);
      costValue = emitter.GetCost();
      timeValue = emitter.GetTimeCost();
      recalcCosts = false;
   }

   // 3D Camera
   //GUIControl.previewCamera.camera.pixelRect = Rect(0, panelHeight, panelWidth, previewHeight);

   var panelRect : Rect = Rect(0, previewHeight, panelWidth, panelHeight);

   GUI.Box(panelRect,"");

   GUILayout.BeginArea(panelRect);

      GUILayout.BeginVertical();

         if (emitter && unitAttributes)
         {
            // Unit queue label
            if (emitter.unitQueue.Count > 0)
            {
               GUILayout.Space(5); // push everything down
               textStyle.normal.textColor = Color.white;
               textStyle.fontSize = 15;
               GUILayout.Label(GUIContent("Unit", "QueueLabel"), textStyle);

               // Unit Type Button grid
               var newUnitTypeButton : int = GUILayout.SelectionGrid(unitAttributes.unitType, unitTypeStrings, 3, GUILayout.MinHeight(40));
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
                  //var newlySelectedSize : float = GUILayout.HorizontalSlider(unitAttributes.size, 0.0, 1.0, GUILayout.ExpandWidth(true));
                  var newlySelectedSize : float = GUILayout.SelectionGrid(Mathf.CeilToInt(unitAttributes.size*valueStrings.Length), valueStrings, valueStrings.Length, GUILayout.ExpandWidth(true));
                  GUILayout.Space (5);
                  if (newlySelectedSize != (unitAttributes.size*valueStrings.Length))
                  {
                     unitAttributes.size = newlySelectedSize/valueStrings.Length;
                     recalcCosts = true;
                  }
               GUILayout.EndHorizontal();
   
               // Strength slider
               GUILayout.BeginHorizontal();
                  GUILayout.Label("Str", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
                  GUILayout.Space(5);
                  //var newlySelectedStrength : float = GUILayout.HorizontalSlider(unitAttributes.strength, 0.0, 1.0, GUILayout.ExpandWidth(true));
                  var newlySelectedStrength : float = GUILayout.SelectionGrid(Mathf.CeilToInt(unitAttributes.strength*valueStrings.Length), valueStrings, valueStrings.Length, GUILayout.ExpandWidth(true));
                  GUILayout.Space (5);
                  if (newlySelectedStrength != (unitAttributes.strength*valueStrings.Length))
                  {
                     unitAttributes.strength = newlySelectedStrength/valueStrings.Length;
                     recalcCosts = true;
                  }
               GUILayout.EndHorizontal();
            }
         }

         // Unit queue label
         if (emitter.unitQueue.Count > 0)
            GUILayout.Space(20);
         else
            GUILayout.FlexibleSpace(); // push everything down

         textStyle.normal.textColor = Color.white;
         textStyle.fontSize = 15;
         GUILayout.Label(GUIContent("Queue", "QueueLabel"), textStyle);

         // Queue manipulators
         GUILayout.BeginHorizontal();
            // Add unit button
            var ua : UnitAttributes;
            if (GUILayout.Button(GUIContent("Add", "AddToQueue"), GUILayout.MinHeight(40)))
            {
               HitAddType(unitAttributes.unitType);
            }
            // Ins unit button
            if (emitter.unitQueue.Count > 0 && GUILayout.Button(GUIContent("Ins", "InsertInQueue"), GUILayout.MinHeight(40)))
            {
               ua = new UnitAttributes();
               emitter.InsertIntoQueue(selectedUnitIndex, ua);
               recalcCosts = true;
               SetSelectedUnitIndex(selectedUnitIndex);
            }
         GUILayout.EndHorizontal();

         // Forces add button to vertical middle
         if (emitter.unitQueue.Count <= 0)
            GUILayout.FlexibleSpace();

         GUILayout.BeginHorizontal();
            // Move unit forward button
            if (emitter.unitQueue.Count > 0 && GUILayout.Button(GUIContent("<", "Forward"), GUILayout.MinHeight(40)))
            {
               if (selectedUnitIndex > 0)
               {
                  emitter.MoveInQueue(selectedUnitIndex, true);
                  SetSelectedUnitIndex(selectedUnitIndex-1);
               }
            }
            // Move unit backward button
            if (emitter.unitQueue.Count > 0 && GUILayout.Button(GUIContent(">", "Backward"), GUILayout.MinHeight(40)))
            {
               if (selectedUnitIndex < (emitter.unitQueue.Count-1))
               {
                  emitter.MoveInQueue(selectedUnitIndex, false);
                  SetSelectedUnitIndex(selectedUnitIndex+1);
               }
            }
         GUILayout.EndHorizontal();

         GUILayout.Space(10);

         GUILayout.BeginHorizontal();
            // Remove unit button
            if (GUILayout.Button(GUIContent("Del", "DeleteFromQueue"), GUILayout.MinHeight(20)))
            {
               if (emitter.unitQueue.Count > 1)
               {
                  // Only delete if we have queue contents
                  emitter.RemoveFromQueue(selectedUnitIndex);
   
                  // If queue is empty, remove unit controls
                  if (emitter.unitQueue.Count == 0)
                     unitAttributes = null;
                  // If we deleted the last unit, reselect new last unit
                  if (selectedUnitIndex > emitter.unitQueue.Count-1)
                     SetSelectedUnitIndex(emitter.unitQueue.Count-1);
   
                  unitAttributes = emitter.unitQueue[selectedUnitIndex];
                  recalcCosts = true;
               }
            }
         GUILayout.EndHorizontal();

         if (emitter.unitQueue.Count > 0)
         {
            GUILayout.Space(20);

            // Color Wheel
            var newlySelectedColor : Color = RGBCircle(emitter.color, "", colorCircle);
            if (newlySelectedColor != emitter.color)
            {
               emitter.SetColor(newlySelectedColor);
               unitAttributes.color = newlySelectedColor;
               recalcCosts = true;
            }

            GUILayout.Space(10);

            // Speed slider
            GUILayout.BeginHorizontal();
               GUILayout.Label("Spd", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
               GUILayout.Space(5);
               //var newlySelectedLaunchSpeed : float = GUILayout.HorizontalSlider(emitter.launchSpeed, 0.0, 1.0, GUILayout.ExpandWidth(true));
               var newlySelectedLaunchSpeed : float = GUILayout.SelectionGrid(Mathf.CeilToInt(emitter.launchSpeed*valueStrings.Length), valueStrings, valueStrings.Length, GUILayout.ExpandWidth(true));
               GUILayout.Space (5);
               if (newlySelectedLaunchSpeed != (emitter.launchSpeed*valueStrings.Length))
               {
                  emitter.launchSpeed = newlySelectedLaunchSpeed/valueStrings.Length;
                  recalcCosts = true;
               }
            GUILayout.EndHorizontal();

            GUILayout.FlexibleSpace();

            // Credits
            textStyle.normal.textColor = (costValue >= Game.player.credits) ? Color.red : Utility.creditsTextColor;
            textStyle.fontSize = 30;
            GUILayout.Label((costValue>0) ? costValue.ToString() : "+"+(-costValue).ToString(), textStyle);

            // Time
            textStyle.normal.textColor = Color.white;
            textStyle.fontSize = 20;
            GUILayout.Label(GUIContent(timeValue.ToString("#.0")+"sec", "Time"), textStyle);

            // Launch button
            if (GUILayout.Button(GUIContent("Launch", "LaunchButton"), GUILayout.MinHeight(40)))
            {
               // NOTE: Client is calculating cost, unsecure.
               if (costValue <= Game.player.credits)
               {
                  // Deduct cost
                  Game.player.credits -= costValue;
                  emitter.Launch(emitter.launchSpeed);
               }
            }
         }

      GUILayout.EndVertical();
   GUILayout.EndArea();


   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.Alpha1:
      case KeyCode.Keypad1:
         HitAddType(0);
         break;

      case KeyCode.Alpha2:
      case KeyCode.Keypad2:
         HitAddType(1);
         break;

      case KeyCode.Alpha3:
      case KeyCode.Keypad3:
         HitAddType(2);
         break;

      case KeyCode.UpArrow:
         // Move unit forward button
         if (emitter.unitQueue.Count > 0 && selectedUnitIndex > 0)
         {
            emitter.MoveInQueue(selectedUnitIndex, true);
            SetSelectedUnitIndex(selectedUnitIndex-1);
         }
         break;

      case KeyCode.DownArrow:
         // Move unit backward button
         if (emitter.unitQueue.Count > 0 && selectedUnitIndex < (emitter.unitQueue.Count-1))
         {
            emitter.MoveInQueue(selectedUnitIndex, false);
            SetSelectedUnitIndex(selectedUnitIndex+1);
         }
         break;

       case KeyCode.Delete:
       case KeyCode.Backspace:
         if (emitter.unitQueue.Count > 1)
         {
            // Only delete if we have queue contents
            emitter.RemoveFromQueue(selectedUnitIndex);

            // If queue is empty, remove unit controls
            if (emitter.unitQueue.Count == 0)
               unitAttributes = null;
            // If we deleted the last unit, reselect new last unit
            if (selectedUnitIndex > emitter.unitQueue.Count-1)
               SetSelectedUnitIndex(emitter.unitQueue.Count-1);

            unitAttributes = emitter.unitQueue[selectedUnitIndex];
            recalcCosts = true;
         }
         break;

      case KeyCode.Space:
         // NOTE: Client is calculating cost, unsecure.
         if (costValue <= Game.player.credits)
         {
            // Deduct cost
            Game.player.credits -= costValue;
            emitter.Launch(emitter.launchSpeed);
         }
         break;
      }
   }
}

function HitAddType(type : int)
{
   var ua : UnitAttributes;
   ua = new UnitAttributes();
   emitter.AddToQueue(ua);
   SetSelectedUnitIndex(emitter.unitQueue.Count-1);
   unitAttributes.unitType = type;
   recalcCosts = true;
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


/*
         // Unit queue
         unitQueueScrollPosition = GUILayout.BeginScrollView(unitQueueScrollPosition);
            var invCols : int = panelWidth/55;
            var colCount : int = 0;
            var unitCount : int = 0;
            GUILayout.FlexibleSpace(); // push everything down
   
            GUILayout.BeginHorizontal();

               // Loop through all unit attributes and draw buttons for each
               for (var unitAttr in emitter.unitQueue)
               {
                  var isUnitSelected : boolean = (selectedUnitIndex == unitCount);

                  // Draw button, check if index is selected
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
*/