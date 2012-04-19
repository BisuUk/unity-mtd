#pragma strict
#pragma downcast

import CustomWidgets;

var panelHeightPercent : float = 0.25;
var colorCircle : Texture2D;
var previewItemPos : Transform;
var textStyle : GUIStyle;

static var panelWidth : int = 200;
static var panelHeight = Screen.height;

private var squadCountStrings : String[] = ["5-", "-", "+", "5+"];
private var cursorObject : GameObject;
private var previewItem : GameObject;
private var lastSelSquadID : int = -1;
private var costValue : int = 0;
private var timeValue : float = 0;
private var idGenerator : int = 1;
private var squad : UnitSquad;
private var modifingExisting : boolean = false;


function Awake()
{
   panelWidth = Screen.width*0.20;
   squad = new UnitSquad();
}

function SetSquad(newSquad : UnitSquad)
{
   enabled = true;
   squad.Copy(newSquad);
   modifingExisting = true;
   NewPreviewItem(squad.unitType);
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
   panelWidth = Screen.width*0.20;
   panelHeight = Screen.height*0.80;
   var previewHeight = Screen.height-panelHeight;

   // 3D Camera
   GUIControl.previewCamera.camera.pixelRect = Rect(0, panelHeight, panelWidth, previewHeight);

   var panelRect : Rect = Rect(0, previewHeight, panelWidth, panelHeight);

   GUI.Box(panelRect,"");

   GUILayout.BeginArea(panelRect);

      GUILayout.BeginVertical();

         GUILayout.Space(15);

         GUILayout.BeginVertical();
         
            //textStyle.normal.textColor = Color(0.5,0.5,1.0);
            textStyle.normal.textColor = squad.color;
            textStyle.fontSize = 30;
            GUILayout.Label(GUIContent("x"+squad.count.ToString(), "Count"), textStyle);

            GUILayout.BeginHorizontal();
               var squadCountDelta : int = 0;
   
               if (GUILayout.Button(GUIContent("5-", "MinusFive")))
                  squadCountDelta = -5;
               if (GUILayout.Button(GUIContent("-", "Minus")))
                  squadCountDelta = -1;
               if (GUILayout.Button(GUIContent("+", "Plus")))
                  squadCountDelta = 1;
               if (GUILayout.Button(GUIContent("5+", "PlusFive")))
                  squadCountDelta = (squad.count==1) ? 4 : 5;
   
               if (squadCountDelta != 0)
               {
                  squad.count += squadCountDelta;
                  if (squad.count < 1)
                     squad.count = 1;
               }
            GUILayout.EndHorizontal();

         GUILayout.EndVertical();

         GUILayout.FlexibleSpace(); // push everything down
/*
         // Squad count buttons
         var newlySelectedCount : int = GUILayout.SelectionGrid(-1, squadCountStrings, 4);
         var addAmount = 0;
         switch (newlySelectedCount)
         {
            // -5
            case 0: addAmount = -5; break;
            case 1: addAmount = -1; break;
            case 2: addAmount = 1; break;
            case 3: addAmount = (selSquad.count==1) ? 4 : 5; break;
         }

*/
         // Size slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Size", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedSize: float = GUILayout.HorizontalSlider(squad.size, 0.0, 1.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (squad.size != newlySelectedSize)
               squad.size = newlySelectedSize;
         GUILayout.EndHorizontal();

         // Speed slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Spd", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedSpeed: float = GUILayout.HorizontalSlider(squad.speed, 1.0, 5.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (squad.speed != newlySelectedSpeed)
               squad.speed = newlySelectedSpeed;
         GUILayout.EndHorizontal();

         // Effect slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Eft", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedEffect : float = GUILayout.HorizontalSlider(squad.effect, 1.0, 5.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (squad.effect != newlySelectedEffect)
               squad.effect = newlySelectedEffect;
         GUILayout.EndHorizontal();

         // Color Wheel
         GUILayout.BeginHorizontal();
            var newlySelectedColor : Color = RGBCircle(squad.color, "", colorCircle);
            if (newlySelectedColor != squad.color)
               squad.color = newlySelectedColor;
         GUILayout.EndHorizontal();

         // Cost
         //if (costValue != 0)
         //{
            // Credits
            GUILayout.BeginHorizontal();
               textStyle.normal.textColor = ((-costValue) > GameData.player.credits) ? Color.red : Color(0.2,1.0,0.2);
               textStyle.fontSize = 30;
               GUILayout.Label(GUIContent((costValue<0 ? (-costValue).ToString() : "+"+costValue.ToString()), "Cost"), textStyle);
            GUILayout.EndHorizontal();

            // Time
            GUILayout.BeginHorizontal();
               textStyle.normal.textColor = Color.white;
               textStyle.fontSize = 20;
               GUILayout.Label(GUIContent(timeValue.ToString("#.0")+"sec", "Time"), textStyle);
            GUILayout.EndHorizontal();
         //}


         GUILayout.BeginHorizontal();

            if (modifingExisting)
            {
               // Sell button
               if (GUILayout.Button(GUIContent("Sell", "SellButton")))
               {
                  GameData.player.RemoveSquad(squad.id);
                  GameData.player.selectedSquad =  null;
                  enabled = false;
               }
               // Apply button
               if (GUILayout.Button(GUIContent("Apply", "ApplyButton")))
               {
                  // Check cost here.

                  GameData.player.selectedSquad.CopyAttributes(squad);
                  GUIControl.NewCursor(1, squad.unitType);
               }
            }
            else // New squad, not yet added to inv
            {
               // Add button
               if (GUILayout.Button(GUIContent("Add", "AddButton")))
               {
                  squad.owner = Network.player;
                  squad.id = idGenerator;
                  idGenerator += 1;

                  // Check cost here.

                  // Add squad to player inventory
                  GameData.player.selectedSquad = GameData.player.AddSquad(new UnitSquad(squad));
                  SetSquad(GameData.player.selectedSquad);

                  GUIControl.NewCursor(1, squad.unitType);
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
   DestroyPreviewItem();

   if (type>0)
   {
      var prefabName : String = Unit.PrefabName(type);
      previewItem = Instantiate(Resources.Load(prefabName, GameObject), previewItemPos.position, Quaternion.identity);
      previewItem.GetComponent(Unit).enabled = false;
      previewItem.layer = 8; // 3D GUI layer
      previewItem.tag = "";
      previewItem.name = "AttackGUIPreviewItem";
      var pScr : AttackGUIPreviewItem = previewItem.AddComponent(AttackGUIPreviewItem);
      pScr.squad = squad;
   }
}
